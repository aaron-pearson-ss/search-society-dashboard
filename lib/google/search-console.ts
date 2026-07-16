export type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchAnalyticsPayload = {
  rows?: SearchAnalyticsRow[];
  error?: { message?: string };
};

async function querySearchAnalytics({
  accessToken,
  siteUrl,
  startDate,
  endDate,
  dimensions,
  rowLimit = 25_000,
}: {
  accessToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
}): Promise<SearchAnalyticsRow[]> {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions,
      searchType: "web",
      dataState: "final",
      rowLimit,
      startRow: 0,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as SearchAnalyticsPayload;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Search Console performance request failed");
  }
  return payload.rows ?? [];
}

export function fetchDailySearchPerformance(args: {
  accessToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
}) {
  return querySearchAnalytics({ ...args, dimensions: ["date"] });
}

export function fetchDimensionSearchPerformance(args: {
  accessToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimension: "query" | "page";
}) {
  return querySearchAnalytics({ ...args, dimensions: [args.dimension], rowLimit: 5_000 });
}
