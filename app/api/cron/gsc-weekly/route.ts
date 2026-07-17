import { NextRequest, NextResponse } from "next/server";
import { generateInsightsForClient } from "@/lib/insights/generate-client-insights";
import { syncGa4Property } from "@/lib/google/sync-ga4-property";
import { syncSearchConsoleProperty } from "@/lib/google/sync-property";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

type ClientResult = {
  clientId: string;
  clientName: string;
  gsc: { status: "completed" | "skipped" | "failed"; message?: string };
  ga4: { status: "completed" | "skipped" | "failed"; message?: string };
  insights: {
    status: "completed" | "failed";
    count?: number;
    expired?: number;
    message?: string;
  };
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const staleBefore = new Date(
    Date.now() - 6 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: clients, error: clientError } = await supabase
    .from("clients")
    .select("id,name")
    .in("status", ["active", "onboarding"])
    .order("name");

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  const results: ClientResult[] = [];

  for (const client of clients ?? []) {
    const result: ClientResult = {
      clientId: client.id,
      clientName: client.name,
      gsc: { status: "skipped", message: "No linked property" },
      ga4: { status: "skipped", message: "No linked property" },
      insights: { status: "failed", message: "Not attempted" },
    };

    const [{ data: gscProperty }, { data: ga4Property }] = await Promise.all([
      supabase
        .from("gsc_properties")
        .select(
          "id,organisation_id,client_id,site_url,google_connection_id,last_synced_at"
        )
        .eq("client_id", client.id)
        .maybeSingle(),
      supabase
        .from("ga4_properties")
        .select(
          "id,organisation_id,client_id,property_id,google_connection_id,last_synced_at"
        )
        .eq("client_id", client.id)
        .maybeSingle(),
    ]);

    if (gscProperty) {
      if (
        gscProperty.last_synced_at &&
        gscProperty.last_synced_at >= staleBefore
      ) {
        result.gsc = { status: "skipped", message: "Synced within six days" };
      } else {
        try {
          await syncSearchConsoleProperty({
            supabase,
            property: gscProperty as any,
            startedBy: null,
          });
          result.gsc = { status: "completed" };
        } catch (error) {
          result.gsc = {
            status: "failed",
            message: error instanceof Error ? error.message : "Unknown GSC sync error",
          };
        }
      }
    }

    if (ga4Property) {
      if (
        ga4Property.last_synced_at &&
        ga4Property.last_synced_at >= staleBefore
      ) {
        result.ga4 = { status: "skipped", message: "Synced within six days" };
      } else {
        try {
          await syncGa4Property({
            supabase,
            property: ga4Property as any,
            startedBy: null,
          });
          result.ga4 = { status: "completed" };
        } catch (error) {
          result.ga4 = {
            status: "failed",
            message: error instanceof Error ? error.message : "Unknown GA4 sync error",
          };
        }
      }
    }

    try {
      const insightResult = await generateInsightsForClient({
        supabase,
        clientId: client.id,
        resetStatus: true,
      });
      result.insights = {
        status: "completed",
        count: insightResult.insightCount,
        expired: insightResult.expiredCount,
      };
    } catch (error) {
      result.insights = {
        status: "failed",
        message:
          error instanceof Error ? error.message : "Unknown insight generation error",
      };
    }

    results.push(result);
  }

  const failedClients = results.filter(
    (result) =>
      result.gsc.status === "failed" ||
      result.ga4.status === "failed" ||
      result.insights.status === "failed"
  ).length;

  return NextResponse.json({
    checked: results.length,
    failedClients,
    completedAt: new Date().toISOString(),
    results,
  });
}
