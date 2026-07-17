export type DailyMetric = { metric_date: string; clicks: number; impressions: number; position: number };
export type Ga4DailyMetric = { metric_date: string; sessions: number; active_users: number; engaged_sessions: number; key_events: number; total_revenue: number };

export function aggregateMetrics(rows: DailyMetric[]) {
  const clicks = rows.reduce((sum, row) => sum + Number(row.clicks), 0);
  const impressions = rows.reduce((sum, row) => sum + Number(row.impressions), 0);
  const weightedPosition = rows.reduce((sum, row) => sum + Number(row.position) * Number(row.impressions), 0);
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: impressions ? weightedPosition / impressions : 0 };
}

export function aggregateGa4Metrics(rows: Ga4DailyMetric[]) {
  const sessions = rows.reduce((sum, row) => sum + Number(row.sessions), 0);
  const activeUsers = rows.reduce((sum, row) => sum + Number(row.active_users), 0);
  const engagedSessions = rows.reduce((sum, row) => sum + Number(row.engaged_sessions), 0);
  const keyEvents = rows.reduce((sum, row) => sum + Number(row.key_events), 0);
  const revenue = rows.reduce((sum, row) => sum + Number(row.total_revenue), 0);
  return { sessions, activeUsers, engagedSessions, engagementRate: sessions ? engagedSessions / sessions : 0, keyEvents, revenue };
}

export function mergeSearchAndAnalytics(gscRows: DailyMetric[], ga4Rows: Ga4DailyMetric[]) {
  const dates = new Map<string, { date: string; clicks: number; sessions: number }>();
  for (const row of gscRows) dates.set(row.metric_date, { date: row.metric_date, clicks: Number(row.clicks), sessions: 0 });
  for (const row of ga4Rows) {
    const existing = dates.get(row.metric_date) ?? { date: row.metric_date, clicks: 0, sessions: 0 };
    existing.sessions = Number(row.sessions);
    dates.set(row.metric_date, existing);
  }
  return [...dates.values()].sort((a, b) => a.date.localeCompare(b.date));
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
