import { NextRequest, NextResponse } from "next/server";
import { syncSearchConsoleProperty } from "@/lib/google/sync-property";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const staleBefore = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const { data: properties, error } = await supabase
    .from("gsc_properties")
    .select("id, organisation_id, client_id, site_url, google_connection_id, last_synced_at")
    .not("client_id", "is", null)
    .or(`last_synced_at.is.null,last_synced_at.lt.${staleBefore}`)
    .order("last_synced_at", { ascending: true, nullsFirst: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ propertyId: string; clientId: string; status: string; message?: string }> = [];
  for (const property of properties ?? []) {
    try {
      await syncSearchConsoleProperty({ supabase, property: property as any, startedBy: null });
      results.push({ propertyId: property.id, clientId: property.client_id!, status: "completed" });
    } catch (syncError) {
      results.push({
        propertyId: property.id,
        clientId: property.client_id!,
        status: "failed",
        message: syncError instanceof Error ? syncError.message : "Unknown sync error",
      });
    }
  }

  return NextResponse.json({ checked: properties?.length ?? 0, results });
}
