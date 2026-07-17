import {
  aggregateGa4Metrics,
  aggregateMetrics,
  percentChange,
} from "@/lib/reporting";

export type Insight = {
  fingerprint: string;
  insight_type: string;
  severity: "critical" | "warning" | "opportunity" | "info";
  title: string;
  summary: string;
  recommendation: string;
  metric_name?: string;
  current_value?: number;
  previous_value?: number;
  change_percent?: number | null;
};

function formatPercentage(value: number | null) {
  if (value === null) {
    return "new";
  }

  return `${Math.abs(value).toFixed(1)}%`;
}

export function buildInsights(
  gsc: any[],
  ga4: any[],
  dimensions: any[]
): Insight[] {
  const insights: Insight[] = [];

  /*
   * The database queries are ordered from oldest to newest.
   * The final 28 rows represent the current period and the
   * preceding 28 rows represent the comparison period.
   */
  const currentGscRows = gsc.slice(-28);
  const previousGscRows = gsc.slice(-56, -28);

  const currentGa4Rows = ga4.slice(-28);
  const previousGa4Rows = ga4.slice(-56, -28);

  const currentGsc = aggregateMetrics(currentGscRows);
  const previousGsc = aggregateMetrics(previousGscRows);

  const currentGa4 = aggregateGa4Metrics(currentGa4Rows);
  const previousGa4 = aggregateGa4Metrics(previousGa4Rows);

  const addInsight = (insight: Insight) => {
    insights.push(insight);
  };

  /*
   * Only calculate period changes when both periods contain data.
   * This avoids misleading alerts for newly connected properties.
   */
  if (currentGscRows.length > 0 && previousGscRows.length > 0) {
    const clickChange = percentChange(
      currentGsc.clicks,
      previousGsc.clicks
    );

    if (clickChange !== null && clickChange <= -15) {
      addInsight({
        fingerprint: "gsc-click-drop",
        insight_type: "performance_drop",
        severity: clickChange <= -30 ? "critical" : "warning",
        title: "Organic clicks have fallen",
        summary: `GSC clicks are down ${formatPercentage(
          clickChange
        )} versus the previous 28 days.`,
        recommendation:
          "Review the losing queries and landing pages, then check whether rankings, snippets or search demand changed.",
        metric_name: "GSC clicks",
        current_value: currentGsc.clicks,
        previous_value: previousGsc.clicks,
        change_percent: clickChange,
      });
    }
  }

  if (currentGa4Rows.length > 0 && previousGa4Rows.length > 0) {
    const sessionChange = percentChange(
      currentGa4.sessions,
      previousGa4.sessions
    );

    if (sessionChange !== null && sessionChange <= -15) {
      addInsight({
        fingerprint: "ga4-session-drop",
        insight_type: "performance_drop",
        severity: sessionChange <= -30 ? "critical" : "warning",
        title: "Organic sessions have fallen",
        summary: `GA4 organic sessions are down ${formatPercentage(
          sessionChange
        )} versus the previous 28 days.`,
        recommendation:
          "Compare GSC clicks with GA4 landing-page performance and investigate tracking, attribution or conversion-path changes.",
        metric_name: "Organic sessions",
        current_value: currentGa4.sessions,
        previous_value: previousGa4.sessions,
        change_percent: sessionChange,
      });
    }

    const eventChange = percentChange(
      currentGa4.keyEvents,
      previousGa4.keyEvents
    );

    if (eventChange !== null && eventChange <= -20) {
      addInsight({
        fingerprint: "ga4-event-drop",
        insight_type: "conversion_drop",
        severity: eventChange <= -40 ? "critical" : "warning",
        title: "Organic key events have declined",
        summary: `Key events from organic traffic are down ${formatPercentage(
          eventChange
        )} versus the previous 28 days.`,
        recommendation:
          "Check which landing pages and key events lost volume and verify that GA4 event tracking is still firing correctly.",
        metric_name: "Key events",
        current_value: currentGa4.keyEvents,
        previous_value: previousGa4.keyEvents,
        change_percent: eventChange,
      });
    }
  }

  const currentQueries = dimensions.filter(
    (row: any) =>
      row.dimension_type === "query" &&
      row.period_key === "current"
  );

  const nearPageOneQueries = currentQueries.filter(
    (row: any) =>
      Number(row.position) >= 8 &&
      Number(row.position) <= 20 &&
      Number(row.impressions) >= 100
  );

  if (nearPageOneQueries.length > 0) {
    addInsight({
      fingerprint: "near-page-one",
      insight_type: "ranking_opportunity",
      severity: "opportunity",
      title: `${nearPageOneQueries.length} queries are close to page one`,
      summary:
        "These queries rank between positions 8 and 20 and have at least 100 impressions during the current reporting period.",
      recommendation:
        "Prioritise on-page improvements, internal links and content refreshes for the highest-impression terms.",
      metric_name: "Queries",
      current_value: nearPageOneQueries.length,
    });
  }

  const ctrOpportunities = currentQueries.filter(
    (row: any) =>
      Number(row.impressions) >= 250 &&
      Number(row.ctr) < 0.02 &&
      Number(row.position) <= 10
  );

  if (ctrOpportunities.length > 0) {
    addInsight({
      fingerprint: "ctr-opportunity",
      insight_type: "ctr_opportunity",
      severity: "opportunity",
      title: `${ctrOpportunities.length} high-visibility queries have low CTR`,
      summary:
        "These page-one queries receive at least 250 impressions, but fewer than 2% of impressions become clicks.",
      recommendation:
        "Review title tags, meta descriptions, search intent alignment and competing SERP features.",
      metric_name: "Queries",
      current_value: ctrOpportunities.length,
    });
  }

  /*
   * Give the user explicit confirmation when the client was analysed
   * successfully but no warning or opportunity thresholds were met.
   */
  if (insights.length === 0) {
    addInsight({
      fingerprint: "no-significant-findings",
      insight_type: "performance_summary",
      severity: "info",
      title: "No significant performance issues detected",
      summary:
        "The latest GSC and GA4 periods were analysed successfully. No declines or opportunities met the current alert thresholds.",
      recommendation:
        "Continue monitoring performance and review the detailed query, landing-page and conversion reports for smaller changes.",
    });
  }

  return insights;
}
