import { getGoogleAccessToken } from "@/lib/google/access-token";
import { fetchDailySearchPerformance, fetchDimensionSearchPerformance } from "@/lib/google/search-console";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

type SyncPropertyInput = {
  supabase: any;
  property: {
    id: string;
    organisation_id: string;
    client_id: string;
    site_url: string;
    google_connection_id: string;
  };
  startedBy?: string | null;
};

export async function syncSearchConsoleProperty({ supabase, property, startedBy = null }: SyncPropertyInput) {
  const { data: connection, error: connectionError } = await supabase
    .from("google_connections")
    .select("id, encrypted_refresh_token, access_token, access_token_expires_at")
    .eq("id", property.google_connection_id)
    .single();

  if (connectionError || !connection) throw new Error("Google connection could not be loaded");

  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 89);
  const dateFrom = isoDate(start);
  const dateTo = isoDate(end);

  const { data: syncRun, error: runError } = await supabase
    .from("gsc_sync_runs")
    .insert({
      organisation_id: property.organisation_id,
      client_id: property.client_id,
      property_id: property.id,
      started_by: startedBy,
      status: "running",
      date_from: dateFrom,
      date_to: dateTo,
    })
    .select("id")
    .single();

  if (runError || !syncRun) throw new Error(runError?.message ?? "Could not start sync run");

  try {
    const accessToken = await getGoogleAccessToken(connection, supabase);
    const rows = await fetchDailySearchPerformance({ accessToken, siteUrl: property.site_url, startDate: dateFrom, endDate: dateTo });

    const metricRows = rows.filter((row) => row.keys?.[0]).map((row) => ({
      organisation_id: property.organisation_id,
      client_id: property.client_id,
      property_id: property.id,
      metric_date: row.keys![0],
      search_type: "web",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
      updated_at: new Date().toISOString(),
    }));

    if (metricRows.length) {
      const { error } = await supabase.from("gsc_daily_metrics").upsert(metricRows, { onConflict: "property_id,metric_date,search_type" });
      if (error) throw new Error(error.message);
    }

    const currentEnd = new Date(end);
    const currentStart = new Date(currentEnd);
    currentStart.setUTCDate(currentStart.getUTCDate() - 27);
    const previousEnd = new Date(currentStart);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousStart.getUTCDate() - 27);
    const periods = [
      { key: "current", from: isoDate(currentStart), to: isoDate(currentEnd) },
      { key: "previous", from: isoDate(previousStart), to: isoDate(previousEnd) },
    ] as const;

    for (const dimension of ["query", "page"] as const) {
      for (const period of periods) {
        const dimensionRows = await fetchDimensionSearchPerformance({
          accessToken,
          siteUrl: property.site_url,
          startDate: period.from,
          endDate: period.to,
          dimension,
        });

        const { error: deleteError } = await supabase.from("gsc_dimension_metrics")
          .delete().eq("property_id", property.id).eq("dimension_type", dimension).eq("period_key", period.key);
        if (deleteError) throw new Error(deleteError.message);

        const payload = dimensionRows.filter((row) => row.keys?.[0]).map((row) => ({
          organisation_id: property.organisation_id,
          client_id: property.client_id,
          property_id: property.id,
          dimension_type: dimension,
          dimension_value: row.keys![0],
          period_key: period.key,
          date_from: period.from,
          date_to: period.to,
          clicks: row.clicks ?? 0,
          impressions: row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
          updated_at: new Date().toISOString(),
        }));

        for (let index = 0; index < payload.length; index += 500) {
          const { error } = await supabase.from("gsc_dimension_metrics").insert(payload.slice(index, index + 500));
          if (error) throw new Error(error.message);
        }
      }
    }

    const completedAt = new Date().toISOString();
    const { error: completionError } = await supabase.from("gsc_sync_runs")
      .update({ status: "completed", rows_imported: metricRows.length, completed_at: completedAt }).eq("id", syncRun.id);
    if (completionError) throw new Error(completionError.message);

    await supabase.from("gsc_properties").update({ last_synced_at: completedAt, updated_at: completedAt }).eq("id", property.id);
    return { status: "completed" as const, rowsImported: metricRows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await supabase.from("gsc_sync_runs").update({
      status: "failed",
      error_message: message.slice(0, 1000),
      completed_at: new Date().toISOString(),
    }).eq("id", syncRun.id);
    throw error;
  }
}
