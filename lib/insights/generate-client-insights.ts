import { buildInsights } from "@/lib/insights/generate";

type GenerateClientInsightsOptions = {
  supabase: any;
  clientId: string;
  resetStatus?: boolean;
};

export async function generateInsightsForClient({
  supabase,
  clientId,
  resetStatus = true,
}: GenerateClientInsightsOptions) {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id,name,organisation_id")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    throw new Error(
      `Client could not be loaded: ${clientError?.message ?? "Client not found"}`
    );
  }

  const [
    { data: gscData, error: gscError },
    { data: ga4Data, error: ga4Error },
    { data: dimensionData, error: dimensionError },
    { data: existingInsights, error: existingError },
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
      .select("dimension_type,period_key,position,impressions,ctr")
      .eq("client_id", clientId),
    supabase
      .from("client_insights")
      .select("id,fingerprint,status")
      .eq("client_id", clientId),
  ]);

  if (gscError) {
    throw new Error(`Unable to load GSC data for ${client.name}: ${gscError.message}`);
  }
  if (ga4Error) {
    throw new Error(`Unable to load GA4 data for ${client.name}: ${ga4Error.message}`);
  }
  if (dimensionError) {
    throw new Error(
      `Unable to load query data for ${client.name}: ${dimensionError.message}`
    );
  }
  if (existingError) {
    throw new Error(
      `Unable to load existing insights for ${client.name}: ${existingError.message}`
    );
  }

  const insights = buildInsights(gscData ?? [], ga4Data ?? [], dimensionData ?? []);
  const generatedAt = new Date().toISOString();
  const currentFingerprints = new Set(insights.map((insight) => insight.fingerprint));
  const staleIds = (existingInsights ?? [])
    .filter(
      (insight: any) =>
        insight.status !== "dismissed" && !currentFingerprints.has(insight.fingerprint)
    )
    .map((insight: any) => insight.id);

  if (staleIds.length) {
    const { error: staleError } = await supabase
      .from("client_insights")
      .update({
        status: "dismissed",
        reviewed_at: generatedAt,
        reviewed_by: null,
      })
      .in("id", staleIds);

    if (staleError) {
      throw new Error(
        `Unable to expire stale insights for ${client.name}: ${staleError.message}`
      );
    }
  }

  for (const insight of insights) {
    const payload: Record<string, unknown> = {
      ...insight,
      organisation_id: client.organisation_id,
      client_id: clientId,
      generated_at: generatedAt,
    };

    if (resetStatus) {
      payload.status = "new";
      payload.reviewed_at = null;
      payload.reviewed_by = null;
    }

    const { error: upsertError } = await supabase
      .from("client_insights")
      .upsert(payload, { onConflict: "client_id,fingerprint" });

    if (upsertError) {
      throw new Error(
        `Unable to save insight "${insight.title}" for ${client.name}: ${upsertError.message}`
      );
    }
  }

  const { error: analysisError } = await supabase
    .from("clients")
    .update({
      insights_last_analyzed_at: generatedAt,
      insights_last_result_count: insights.length,
    })
    .eq("id", clientId);

  if (analysisError) {
    throw new Error(
      `Insights were generated, but the analysis timestamp could not be saved for ${client.name}: ${analysisError.message}`
    );
  }

  return {
    clientId,
    clientName: client.name,
    generatedAt,
    insightCount: insights.length,
    expiredCount: staleIds.length,
  };
}
