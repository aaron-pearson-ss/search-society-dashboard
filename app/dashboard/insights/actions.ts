"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildInsights } from "@/lib/insights/generate";

export async function generateClientInsights(clientId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to generate insights.");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id,name,organisation_id")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    throw new Error(
      `Client could not be loaded: ${
        clientError?.message ?? "Client not found"
      }`
    );
  }

  const [
    { data: gscData, error: gscError },
    { data: ga4Data, error: ga4Error },
    { data: dimensionData, error: dimensionError },
  ] = await Promise.all([
    supabase
      .from("gsc_daily_metrics")
      .select("metric_date,clicks,impressions,position")
      .eq("client_id", clientId)
      .order("metric_date", { ascending: true }),

    supabase
      .from("ga4_daily_metrics")
      .select(
        "metric_date,sessions,active_users,engaged_sessions,key_events,total_revenue"
      )
      .eq("client_id", clientId)
      .order("metric_date", { ascending: true }),

    supabase
      .from("gsc_dimension_metrics")
      .select(
        "dimension_type,period_key,position,impressions,ctr"
      )
      .eq("client_id", clientId),
  ]);

  if (gscError) {
    throw new Error(
      `Unable to load GSC data for ${client.name}: ${gscError.message}`
    );
  }

  if (ga4Error) {
    throw new Error(
      `Unable to load GA4 data for ${client.name}: ${ga4Error.message}`
    );
  }

  if (dimensionError) {
    throw new Error(
      `Unable to load query data for ${client.name}: ${dimensionError.message}`
    );
  }

  const insights = buildInsights(
    gscData ?? [],
    ga4Data ?? [],
    dimensionData ?? []
  );

  const generatedAt = new Date().toISOString();

  for (const insight of insights) {
    const { error: upsertError } = await supabase
      .from("client_insights")
      .upsert(
        {
          ...insight,
          organisation_id: client.organisation_id,
          client_id: clientId,
          status: "new",
          generated_at: generatedAt,
          reviewed_at: null,
          reviewed_by: null,
        },
        {
          onConflict: "client_id,fingerprint",
        }
      );

    if (upsertError) {
      throw new Error(
        `Unable to save insight "${insight.title}" for ${client.name}: ${upsertError.message}`
      );
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/insights");
  revalidatePath(`/dashboard/clients/${clientId}`);

  return {
    clientName: client.name,
    insightCount: insights.length,
  };
}

export async function setInsightStatus(
  insightId: string,
  status: "reviewed" | "dismissed"
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to update an insight.");
  }

  const { error } = await supabase
    .from("client_insights")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", insightId);

  if (error) {
    throw new Error(`Unable to update insight: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/insights");
}