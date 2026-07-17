import { buildInsights } from "@/lib/insights/generate";

type GenerateClientInsightsOptions = {
  supabase: any;
  clientId: string;
  resetStatus?: boolean;
};

type ExistingInsight = {
  id: string;
  fingerprint: string;
  status: "new" | "reviewed" | "dismissed";
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
      `Client could not be loaded: ${
        clientError?.message ?? "Client not found"
      }`
    );
  }

  const [
    { data: gscData, error: gscError },
    { data: ga4Data, error: ga4Error },
    { data: currentQueries, error: currentQueriesError },
    { data: previousQueries, error: previousQueriesError },
    { data: currentPages, error: currentPagesError },
    { data: previousPages, error: previousPagesError },
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
      .select(
        "dimension_type,dimension_value,period_key,clicks,impressions,ctr,position"
      )
      .eq("client_id", clientId)
      .eq("dimension_type", "query")
      .eq("period_key", "current")
      .order("impressions", { ascending: false })
      .limit(1000),

    supabase
      .from("gsc_dimension_metrics")
      .select(
        "dimension_type,dimension_value,period_key,clicks,impressions,ctr,position"
      )
      .eq("client_id", clientId)
      .eq("dimension_type", "query")
      .eq("period_key", "previous")
      .order("impressions", { ascending: false })
      .limit(1000),

    supabase
      .from("gsc_dimension_metrics")
      .select(
        "dimension_type,dimension_value,period_key,clicks,impressions,ctr,position"
      )
      .eq("client_id", clientId)
      .eq("dimension_type", "page")
      .eq("period_key", "current")
      .order("clicks", { ascending: false })
      .limit(1000),

    supabase
      .from("gsc_dimension_metrics")
      .select(
        "dimension_type,dimension_value,period_key,clicks,impressions,ctr,position"
      )
      .eq("client_id", clientId)
      .eq("dimension_type", "page")
      .eq("period_key", "previous")
      .order("clicks", { ascending: false })
      .limit(1000),

    supabase
      .from("client_insights")
      .select("id,fingerprint,status")
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

  const dimensionError =
    currentQueriesError ??
    previousQueriesError ??
    currentPagesError ??
    previousPagesError;

  if (dimensionError) {
    throw new Error(
      `Unable to load query and page data for ${client.name}: ${dimensionError.message}`
    );
  }

  if (existingError) {
    throw new Error(
      `Unable to load existing insights for ${client.name}: ${existingError.message}`
    );
  }

  const dimensionData = [
    ...(currentQueries ?? []),
    ...(previousQueries ?? []),
    ...(currentPages ?? []),
    ...(previousPages ?? []),
  ];

  const insights = buildInsights(
    gscData ?? [],
    ga4Data ?? [],
    dimensionData
  );

  console.log("[INSIGHTS DEBUG]", {
    clientId,
    gscRows: gscData?.length ?? 0,
    ga4Rows: ga4Data?.length ?? 0,
    currentQueryRows: currentQueries?.length ?? 0,
    previousQueryRows: previousQueries?.length ?? 0,
    currentPageRows: currentPages?.length ?? 0,
    previousPageRows: previousPages?.length ?? 0,
    dimensionRows: dimensionData.length,
    generatedInsights: insights.length,
    fingerprints: insights.map((insight) => insight.fingerprint),
  });

  const generatedAt = new Date().toISOString();

  const existing = (existingInsights ?? []) as ExistingInsight[];

  const existingByFingerprint = new Map(
    existing.map((insight) => [insight.fingerprint, insight])
  );

  const currentFingerprints = new Set(
    insights.map((insight) => insight.fingerprint)
  );

  const staleIds = existing
    .filter(
      (insight) =>
        insight.status !== "dismissed" &&
        !currentFingerprints.has(insight.fingerprint)
    )
    .map((insight) => insight.id);

  if (staleIds.length > 0) {
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
    const existingInsight = existingByFingerprint.get(
      insight.fingerprint
    );

    const payload: Record<string, unknown> = {
      ...insight,
      organisation_id: client.organisation_id,
      client_id: clientId,
      generated_at: generatedAt,
    };

    if (!existingInsight) {
      payload.status = "new";
      payload.reviewed_at = null;
      payload.reviewed_by = null;
    } else if (resetStatus && existingInsight.status === "new") {
      payload.status = "new";
    }

    const { error: upsertError } = await supabase
      .from("client_insights")
      .upsert(payload, {
        onConflict: "client_id,fingerprint",
      });

    if (upsertError) {
      throw new Error(
        `Unable to save insight "${insight.title}" for ${client.name}: ${upsertError.message}`
      );
    }
  }

  const visibleInsightCount = insights.filter((insight) => {
    const existingInsight = existingByFingerprint.get(
      insight.fingerprint
    );

    return existingInsight?.status !== "dismissed";
  }).length;

  const { error: analysisError } = await supabase
    .from("clients")
    .update({
      insights_last_analyzed_at: generatedAt,
      insights_last_result_count: visibleInsightCount,
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
    insightCount: visibleInsightCount,
    expiredCount: staleIds.length,
  };
}