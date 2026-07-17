import {
  aggregateGa4Metrics,
  aggregateMetrics,
  percentChange,
} from "@/lib/reporting";
import { INSIGHT_RULES } from "@/lib/insights/rules";

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
  impact_score: number;
  priority: "high" | "medium" | "low";
};

type MetricRow = Record<string, unknown>;
type DimensionRow = Record<string, unknown>;

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function dimensionLabel(row: DimensionRow): string {
  return stringValue(row.dimension_value ?? row.query ?? row.page ?? row.value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercentage(value: number | null): string {
  return value === null ? "new" : `${Math.abs(value).toFixed(1)}%`;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function conversionRate(events: number, sessions: number): number {
  return sessions > 0 ? events / sessions : 0;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function entityFingerprint(rule: string, label: string): string {
  return `${rule}:${stableHash(label.toLowerCase())}`;
}

function shortLabel(value: string, maximum = 90): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}

function getRowDate(row: MetricRow): Date | null {
  const raw = row.date ?? row.metric_date ?? row.day;
  if (typeof raw !== "string") return null;

  const date = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSinceLatest(rows: MetricRow[]): number | null {
  const timestamps = rows
    .map(getRowDate)
    .filter((date): date is Date => date !== null)
    .map((date) => date.getTime());

  if (timestamps.length === 0) return null;
  return Math.floor((Date.now() - Math.max(...timestamps)) / 86_400_000);
}

function splitPeriods<T>(rows: T[]) {
  const days = INSIGHT_RULES.periods.comparisonDays;
  return {
    current: rows.slice(-days),
    previous: rows.slice(-(days * 2), -days),
  };
}

function hasEnoughDays(current: unknown[], previous: unknown[]): boolean {
  const minimum = INSIGHT_RULES.periods.minimumDaysPerPeriod;
  return current.length >= minimum && previous.length >= minimum;
}

function severityForDrop(
  change: number,
  criticalThreshold: number
): "critical" | "warning" {
  return change <= criticalThreshold ? "critical" : "warning";
}


function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function calculateImpactScore(
  insight: Omit<Insight, "impact_score" | "priority">
): number {
  const scoring = INSIGHT_RULES.scoring;
  const base = scoring.severityBase[insight.severity];
  const typeBonus =
    scoring.typeBonus[
      insight.insight_type as keyof typeof scoring.typeBonus
    ] ?? 0;

  const changeBonus =
    insight.change_percent === null || insight.change_percent === undefined
      ? 0
      : Math.min(15, Math.abs(insight.change_percent) / 4);

  const volume = Math.max(
    0,
    Number(insight.previous_value ?? insight.current_value ?? 0)
  );
  const volumeBonus =
    volume > 0 ? Math.min(10, Math.log10(volume + 1) * 2.5) : 0;

  let opportunityBonus = 0;

  if (
    insight.insight_type === "ranking_opportunity" &&
    insight.current_value !== undefined
  ) {
    opportunityBonus = clamp((20 - insight.current_value) * 0.9, 0, 12);
  }

  if (
    insight.insight_type === "ctr_opportunity" &&
    insight.current_value !== undefined
  ) {
    opportunityBonus = clamp((0.02 - insight.current_value) * 400, 0, 8);
  }

  return Math.round(
    clamp(
      base + typeBonus + changeBonus + volumeBonus + opportunityBonus,
      0,
      scoring.maximumScore
    )
  );
}

function priorityForScore(score: number): "high" | "medium" | "low" {
  if (score >= INSIGHT_RULES.scoring.highPriorityMinimum) return "high";
  if (score >= INSIGHT_RULES.scoring.mediumPriorityMinimum) return "medium";
  return "low";
}

export function buildInsights(
  gsc: MetricRow[],
  ga4: MetricRow[],
  dimensions: DimensionRow[]
): Insight[] {
  const insights: Insight[] = [];
  const add = (
    insight: Omit<Insight, "impact_score" | "priority">
  ) => {
    const impactScore = calculateImpactScore(insight);
    insights.push({
      ...insight,
      impact_score: impactScore,
      priority: priorityForScore(impactScore),
    });
  };

  const gscPeriods = splitPeriods(gsc);
  const ga4Periods = splitPeriods(ga4);
  const currentGsc = aggregateMetrics(gscPeriods.current as any[]);
  const previousGsc = aggregateMetrics(gscPeriods.previous as any[]);
  const currentGa4 = aggregateGa4Metrics(ga4Periods.current as any[]);
  const previousGa4 = aggregateGa4Metrics(ga4Periods.previous as any[]);

  const gscReady = hasEnoughDays(gscPeriods.current, gscPeriods.previous);
  const ga4Ready = hasEnoughDays(ga4Periods.current, ga4Periods.previous);

  if (gscReady) {
    const rule = INSIGHT_RULES.gscClicks;
    const change = percentChange(currentGsc.clicks, previousGsc.clicks);

    if (
      previousGsc.clicks >= rule.minimumPrevious &&
      change !== null &&
      change <= rule.warningDropPercent
    ) {
      add({
        fingerprint: "gsc-click-drop",
        insight_type: "performance_drop",
        severity: severityForDrop(change, rule.criticalDropPercent),
        title: "Organic clicks have fallen",
        summary: `Organic clicks fell ${formatPercentage(change)}, from ${formatNumber(previousGsc.clicks)} to ${formatNumber(currentGsc.clicks)} in the latest 28-day period.`,
        recommendation:
          "Review the queries and landing pages with the largest click losses. Check ranking movement, indexing, search demand and snippet changes.",
        metric_name: "GSC clicks",
        current_value: currentGsc.clicks,
        previous_value: previousGsc.clicks,
        change_percent: change,
      });
    } else if (
      previousGsc.clicks >= rule.minimumPrevious &&
      change !== null &&
      change >= rule.positiveGrowthPercent
    ) {
      add({
        fingerprint: "gsc-click-growth",
        insight_type: "positive_performance",
        severity: "info",
        title: "Organic clicks are growing strongly",
        summary: `Organic clicks increased ${formatPercentage(change)}, from ${formatNumber(previousGsc.clicks)} to ${formatNumber(currentGsc.clicks)} in the latest 28-day period.`,
        recommendation:
          "Identify the queries and pages driving growth, reinforce them with internal links, and improve their conversion paths.",
        metric_name: "GSC clicks",
        current_value: currentGsc.clicks,
        previous_value: previousGsc.clicks,
        change_percent: change,
      });
    }
  }

  if (ga4Ready) {
    const sessionRule = INSIGHT_RULES.ga4Sessions;
    const sessionChange = percentChange(currentGa4.sessions, previousGa4.sessions);

    if (
      previousGa4.sessions >= sessionRule.minimumPrevious &&
      sessionChange !== null &&
      sessionChange <= sessionRule.warningDropPercent
    ) {
      add({
        fingerprint: "ga4-session-drop",
        insight_type: "performance_drop",
        severity: severityForDrop(sessionChange, sessionRule.criticalDropPercent),
        title: "Organic sessions have fallen",
        summary: `Organic sessions fell ${formatPercentage(sessionChange)}, from ${formatNumber(previousGa4.sessions)} to ${formatNumber(currentGa4.sessions)} in the latest 28-day period.`,
        recommendation:
          "Compare the decline with GSC clicks and landing-page performance. Investigate tracking, attribution, rankings and user-journey changes.",
        metric_name: "Organic sessions",
        current_value: currentGa4.sessions,
        previous_value: previousGa4.sessions,
        change_percent: sessionChange,
      });
    }

    const eventRule = INSIGHT_RULES.keyEvents;
    const eventChange = percentChange(currentGa4.keyEvents, previousGa4.keyEvents);

    if (
      previousGa4.keyEvents >= eventRule.minimumPrevious &&
      eventChange !== null &&
      eventChange <= eventRule.warningDropPercent
    ) {
      add({
        fingerprint: "ga4-event-drop",
        insight_type: "conversion_drop",
        severity: severityForDrop(eventChange, eventRule.criticalDropPercent),
        title: "Organic key events have declined",
        summary: `Organic key events fell ${formatPercentage(eventChange)}, from ${formatNumber(previousGa4.keyEvents)} to ${formatNumber(currentGa4.keyEvents)} in the latest 28-day period.`,
        recommendation:
          "Check which landing pages and events lost volume, then verify that forms, calls, ecommerce and GA4 tracking still work.",
        metric_name: "Key events",
        current_value: currentGa4.keyEvents,
        previous_value: previousGa4.keyEvents,
        change_percent: eventChange,
      });
    }

    const rateRule = INSIGHT_RULES.conversionRate;
    const currentRate = conversionRate(currentGa4.keyEvents, currentGa4.sessions);
    const previousRate = conversionRate(previousGa4.keyEvents, previousGa4.sessions);
    const rateChange = percentChange(currentRate, previousRate);

    if (
      previousGa4.sessions >= rateRule.minimumPreviousSessions &&
      previousGa4.keyEvents >= rateRule.minimumPreviousEvents &&
      rateChange !== null &&
      rateChange <= rateRule.warningDropPercent
    ) {
      add({
        fingerprint: "ga4-conversion-rate-drop",
        insight_type: "conversion_rate_drop",
        severity: severityForDrop(rateChange, rateRule.criticalDropPercent),
        title: "Organic conversion rate has weakened",
        summary: `Organic conversion rate fell ${formatPercentage(rateChange)}, from ${formatRate(previousRate)} to ${formatRate(currentRate)}.`,
        recommendation:
          "Review intent alignment, device performance, landing-page friction and the consistency of key-event tracking.",
        metric_name: "Organic conversion rate",
        current_value: currentRate,
        previous_value: previousRate,
        change_percent: rateChange,
      });
    }

    const trafficRule = INSIGHT_RULES.trafficWithoutConversions;
    if (
      currentGa4.sessions >= trafficRule.minimumCurrentSessions &&
      sessionChange !== null &&
      eventChange !== null &&
      sessionChange >= trafficRule.minimumTrafficGrowthPercent &&
      eventChange <= trafficRule.maximumEventGrowthPercent
    ) {
      add({
        fingerprint: "traffic-growth-without-conversions",
        insight_type: "conversion_opportunity",
        severity: "opportunity",
        title: "Organic traffic growth is not converting",
        summary: `Organic sessions increased ${formatPercentage(sessionChange)}, while key events changed by ${eventChange.toFixed(1)}%.`,
        recommendation:
          "Identify the growing landing pages and improve calls to action, intent alignment, internal journeys and conversion tracking.",
        metric_name: "Organic sessions",
        current_value: currentGa4.sessions,
        previous_value: previousGa4.sessions,
        change_percent: sessionChange,
      });
    }
  }

  const currentQueries = dimensions.filter(
    (row) => row.dimension_type === "query" && row.period_key === "current"
  );
  const previousQueries = dimensions.filter(
    (row) => row.dimension_type === "query" && row.period_key === "previous"
  );
  const currentPages = dimensions.filter(
    (row) => row.dimension_type === "page" && row.period_key === "current"
  );
  const previousPages = dimensions.filter(
    (row) => row.dimension_type === "page" && row.period_key === "previous"
  );

  const previousQueryMap = new Map(
    previousQueries.map((row) => [dimensionLabel(row).toLowerCase(), row])
  );
  const previousPageMap = new Map(
    previousPages.map((row) => [dimensionLabel(row).toLowerCase(), row])
  );

  const nearRule = INSIGHT_RULES.nearPageOne;
  currentQueries
    .filter((row) => {
      const position = numberValue(row.position);
      return (
        dimensionLabel(row) &&
        position >= nearRule.minimumPosition &&
        position <= nearRule.maximumPosition &&
        numberValue(row.impressions) >= nearRule.minimumImpressions
      );
    })
    .sort((a, b) => numberValue(b.impressions) - numberValue(a.impressions))
    .slice(0, nearRule.maximumInsights)
    .forEach((row) => {
      const label = dimensionLabel(row);
      const position = numberValue(row.position);
      const impressions = numberValue(row.impressions);
      add({
        fingerprint: entityFingerprint("near-page-one", label),
        insight_type: "ranking_opportunity",
        severity: "opportunity",
        title: `Ranking opportunity: ${shortLabel(label)}`,
        summary: `“${label}” averaged position ${position.toFixed(1)} from ${formatNumber(impressions)} impressions in the current period.`,
        recommendation:
          "Review the ranking page against search intent, strengthen topical coverage and headings, add relevant internal links, and refresh outdated sections.",
        metric_name: "Average position",
        current_value: position,
      });
    });

  const ctrRule = INSIGHT_RULES.ctrOpportunity;
  currentQueries
    .filter((row) => {
      const ctr = numberValue(row.ctr);
      return (
        dimensionLabel(row) &&
        numberValue(row.impressions) >= ctrRule.minimumImpressions &&
        numberValue(row.position) <= ctrRule.maximumPosition &&
        ctr < ctrRule.maximumCtr
      );
    })
    .sort((a, b) => numberValue(b.impressions) - numberValue(a.impressions))
    .slice(0, ctrRule.maximumInsights)
    .forEach((row) => {
      const label = dimensionLabel(row);
      const ctr = numberValue(row.ctr);
      const impressions = numberValue(row.impressions);
      const position = numberValue(row.position);
      add({
        fingerprint: entityFingerprint("ctr-opportunity", label),
        insight_type: "ctr_opportunity",
        severity: "opportunity",
        title: `CTR opportunity: ${shortLabel(label)}`,
        summary: `“${label}” generated ${formatNumber(impressions)} impressions at position ${position.toFixed(1)}, but CTR was only ${formatRate(ctr)}.`,
        recommendation:
          "Rewrite the title and meta description around the search intent, assess competing SERP features, and check whether the ranking page is the best match.",
        metric_name: "CTR",
        current_value: ctr,
      });
    });

  const rankingRule = INSIGHT_RULES.rankingImprovement;
  currentQueries
    .map((current) => {
      const label = dimensionLabel(current);
      const previous = previousQueryMap.get(label.toLowerCase());
      if (!label || !previous) return null;

      const currentPosition = numberValue(current.position);
      const previousPosition = numberValue(previous.position);
      const gain = previousPosition - currentPosition;

      if (
        numberValue(current.impressions) < rankingRule.minimumImpressions ||
        gain < rankingRule.minimumPositionGain ||
        currentPosition > rankingRule.maximumCurrentPosition
      ) {
        return null;
      }
      return { current, label, currentPosition, previousPosition, gain };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, rankingRule.maximumInsights)
    .forEach(({ label, currentPosition, previousPosition, gain }) => {
      add({
        fingerprint: entityFingerprint("ranking-improvement", label),
        insight_type: "ranking_growth",
        severity: "info",
        title: `Ranking gain: ${shortLabel(label)}`,
        summary: `“${label}” improved ${gain.toFixed(1)} positions, from ${previousPosition.toFixed(1)} to ${currentPosition.toFixed(1)}.`,
        recommendation:
          "Protect the gain by reinforcing internal links, keeping the page fresh and improving the conversion path for this search intent.",
        metric_name: "Average position",
        current_value: currentPosition,
        previous_value: previousPosition,
        change_percent: null,
      });
    });

  const pageRule = INSIGHT_RULES.landingPageDecline;
  currentPages
    .map((current) => {
      const label = dimensionLabel(current);
      const previous = previousPageMap.get(label.toLowerCase());
      if (!label || !previous) return null;

      const currentClicks = numberValue(current.clicks);
      const previousClicks = numberValue(previous.clicks);
      const change = percentChange(currentClicks, previousClicks);

      if (
        previousClicks < pageRule.minimumPreviousClicks ||
        change === null ||
        change > pageRule.warningDropPercent
      ) {
        return null;
      }

      return { label, currentClicks, previousClicks, change };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.change - b.change)
    .slice(0, pageRule.maximumInsights)
    .forEach(({ label, currentClicks, previousClicks, change }) => {
      add({
        fingerprint: entityFingerprint("landing-page-drop", label),
        insight_type: "landing_page_drop",
        severity: severityForDrop(change, pageRule.criticalDropPercent),
        title: `Landing-page decline: ${shortLabel(label)}`,
        summary: `This page lost ${formatPercentage(change)} of its organic clicks, falling from ${formatNumber(previousClicks)} to ${formatNumber(currentClicks)}.`,
        recommendation:
          "Check rankings, indexing, cannibalisation, search intent, content decay and recent technical or editorial changes affecting this URL.",
        metric_name: "Page clicks",
        current_value: currentClicks,
        previous_value: previousClicks,
        change_percent: change,
      });
    });

  const freshness = daysSinceLatest([...gsc, ...ga4]);
  if (freshness !== null && freshness > INSIGHT_RULES.periods.freshnessWarningDays) {
    add({
      fingerprint: "data-freshness-warning",
      insight_type: "data_quality",
      severity: "warning",
      title: "Analytics data may be stale",
      summary: `The latest stored analytics row is ${freshness} days old, so findings may not reflect current performance.`,
      recommendation:
        "Run the client sync manually and check the Google connection, selected properties and cron logs.",
      metric_name: "Data age",
      current_value: freshness,
    });
  }

  if (!gscReady && !ga4Ready) {
    add({
      fingerprint: "insufficient-comparison-data",
      insight_type: "data_quality",
      severity: "info",
      title: "More historical data is needed",
      summary: `A reliable comparison requires at least ${INSIGHT_RULES.periods.minimumDaysPerPeriod} days in both current and previous periods.`,
      recommendation:
        "Keep the data connections active and run the sync again once enough history has been collected.",
    });
  }

  if (insights.length === 0) {
    add({
      fingerprint: "no-significant-findings",
      insight_type: "performance_summary",
      severity: "info",
      title: "No significant performance issues detected",
      summary:
        "The latest GSC and GA4 periods were analysed with minimum-volume safeguards. No material findings met the configured thresholds.",
      recommendation:
        "Continue monitoring performance and review the detailed reports for smaller movements.",
    });
  }

  return insights;
}
