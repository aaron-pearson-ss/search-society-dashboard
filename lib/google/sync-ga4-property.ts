import { getGoogleAccessToken } from "@/lib/google/access-token";
import { fetchOrganicDailyGa4Performance } from "@/lib/google/analytics";

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function gaDate(value: string) { return `${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`; }

export async function syncGa4Property({ supabase, property, startedBy = null }: { supabase: any; property: any; startedBy?: string | null }) {
  const { data: connection } = await supabase.from("google_connections")
    .select("id, encrypted_refresh_token, access_token, access_token_expires_at")
    .eq("id", property.google_connection_id).single();
  if (!connection) throw new Error("Google connection could not be loaded");

  const end = new Date(); end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 89);
  const dateFrom = isoDate(start); const dateTo = isoDate(end);
  const { data: run, error: runError } = await supabase.from("ga4_sync_runs").insert({
    organisation_id: property.organisation_id, client_id: property.client_id, property_id: property.id,
    started_by: startedBy, status: "running", date_from: dateFrom, date_to: dateTo,
  }).select("id").single();
  if (runError || !run) throw new Error(runError?.message ?? "Could not start GA4 sync");

  try {
    const accessToken = await getGoogleAccessToken(connection, supabase);
    const rows = await fetchOrganicDailyGa4Performance({ accessToken, propertyId: property.property_id, startDate: dateFrom, endDate: dateTo });
    const payload = rows.map((row: any) => ({
      organisation_id: property.organisation_id, client_id: property.client_id, property_id: property.id,
      metric_date: gaDate(row.dimensionValues?.[0]?.value ?? ""),
      active_users: Number(row.metricValues?.[0]?.value ?? 0), sessions: Number(row.metricValues?.[1]?.value ?? 0),
      engaged_sessions: Number(row.metricValues?.[2]?.value ?? 0), key_events: Number(row.metricValues?.[3]?.value ?? 0),
      total_revenue: Number(row.metricValues?.[4]?.value ?? 0), updated_at: new Date().toISOString(),
    })).filter((row: any) => row.metric_date.length === 10);
    if (payload.length) {
      const { error } = await supabase.from("ga4_daily_metrics").upsert(payload, { onConflict: "property_id,metric_date" });
      if (error) throw new Error(error.message);
    }
    const completedAt = new Date().toISOString();
    await supabase.from("ga4_sync_runs").update({ status: "completed", rows_imported: payload.length, completed_at: completedAt }).eq("id", run.id);
    await supabase.from("ga4_properties").update({ last_synced_at: completedAt, updated_at: completedAt }).eq("id", property.id);
    return payload.length;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GA4 sync error";
    await supabase.from("ga4_sync_runs").update({ status: "failed", error_message: message.slice(0,1000), completed_at: new Date().toISOString() }).eq("id", run.id);
    throw error;
  }
}
