export type DailyMetric = { metric_date: string; clicks: number; impressions: number; position: number };

export function aggregateMetrics(rows: DailyMetric[]) {
  const clicks = rows.reduce((sum, row) => sum + Number(row.clicks), 0);
  const impressions = rows.reduce((sum, row) => sum + Number(row.impressions), 0);
  const weightedPosition = rows.reduce((sum, row) => sum + Number(row.position) * Number(row.impressions), 0);
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: impressions ? weightedPosition / impressions : 0 };
}

export function percentChange(current: number, previous: number, inverse = false) {
  if (!previous) return current ? null : 0;
  const raw = ((current - previous) / previous) * 100;
  return inverse ? -raw : raw;
}

export function formatDelta(value: number | null) {
  if (value === null) return "New";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
