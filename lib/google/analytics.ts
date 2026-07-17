export type Ga4PropertySummary = { property?: string; displayName?: string };

type AccountSummariesPayload = {
  accountSummaries?: Array<{ propertySummaries?: Ga4PropertySummary[] }>;
  error?: { message?: string };
};

export async function fetchGa4Properties(accessToken: string) {
  const response = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const payload = (await response.json()) as AccountSummariesPayload;
  if (!response.ok) throw new Error(payload.error?.message ?? "Could not retrieve GA4 properties");
  return (payload.accountSummaries ?? []).flatMap((account) => account.propertySummaries ?? []);
}

export async function fetchOrganicDailyGa4Performance(args: {
  accessToken: string;
  propertyId: string;
  startDate: string;
  endDate: string;
}) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${args.propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${args.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: args.startDate, endDate: args.endDate }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "engagedSessions" },
        { name: "keyEvents" },
        { name: "totalRevenue" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "sessionDefaultChannelGroup",
          stringFilter: { matchType: "EXACT", value: "Organic Search", caseSensitive: false },
        },
      },
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: "10000",
    }),
    cache: "no-store",
  });
  const payload = await response.json() as any;
  if (!response.ok) throw new Error(payload.error?.message ?? "GA4 report request failed");
  return payload.rows ?? [];
}
