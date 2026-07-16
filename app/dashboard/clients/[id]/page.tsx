import Link from "next/link";
import { notFound } from "next/navigation";
import { PerformanceChart } from "@/components/gsc/performance-chart";
import { AnalysisSection, type DimensionMetric } from "@/components/gsc/analysis-section";
import { Icons } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { assignGscProperty, syncGscPerformance } from "./gsc-actions";

const statusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  onboarding: "bg-blue-50 text-blue-700 ring-blue-600/20",
  paused: "bg-amber-50 text-amber-700 ring-amber-600/20",
  churned: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

type Metric = { metric_date: string; clicks: number; impressions: number; ctr: number; position: number };

function total(rows: Metric[], key: "clicks" | "impressions") {
  return rows.reduce((sum, row) => sum + Number(row[key]), 0);
}

function aggregate(rows: Metric[]) {
  const clicks = total(rows, "clicks");
  const impressions = total(rows, "impressions");
  const weightedPosition = rows.reduce((sum, row) => sum + Number(row.position) * Number(row.impressions), 0);
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    position: impressions ? weightedPosition / impressions : 0,
  };
}

function change(current: number, previous: number) {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}

function formatChange(value: number | null) {
  if (value === null) return "New";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ gsc?: string; analysis?: string; filter?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const { data: linkedProperty } = await supabase.from("gsc_properties").select("id, site_url, permission_level, last_synced_at").eq("client_id", id).maybeSingle();
  const { data: availableProperties } = await supabase.from("gsc_properties").select("id, site_url, permission_level").eq("organisation_id", client.organisation_id).order("site_url");
  const { data: metricData } = await supabase.from("gsc_daily_metrics").select("metric_date, clicks, impressions, ctr, position").eq("client_id", id).order("metric_date", { ascending: true }).limit(90);
  const { data: lastSync } = await supabase.from("gsc_sync_runs").select("status, rows_imported, error_message, completed_at, started_at").eq("client_id", id).order("started_at", { ascending: false }).limit(1).maybeSingle();
  const analysisType = query.analysis === "page" ? "page" : "query";
  const analysisFilter = query.filter ?? "";
  const { data: dimensionData } = await supabase
    .from("gsc_dimension_metrics")
    .select("dimension_value, period_key, clicks, impressions, ctr, position")
    .eq("client_id", id)
    .eq("dimension_type", analysisType)
    .limit(10000);

  const rows = (metricData ?? []).map((row) => ({
    metric_date: row.metric_date,
    clicks: Number(row.clicks),
    impressions: Number(row.impressions),
    ctr: Number(row.ctr),
    position: Number(row.position),
  }));
  const currentRows = rows.slice(-28);
  const previousRows = rows.slice(-56, -28);
  const current = aggregate(currentRows);
  const previous = aggregate(previousRows);
  const metricCards = [
    { label: "Clicks", value: current.clicks.toLocaleString("en-GB"), delta: change(current.clicks, previous.clicks), note: "Last 28 days" },
    { label: "Impressions", value: current.impressions.toLocaleString("en-GB"), delta: change(current.impressions, previous.impressions), note: "Last 28 days" },
    { label: "CTR", value: `${(current.ctr * 100).toFixed(1)}%`, delta: change(current.ctr, previous.ctr), note: "Click-through rate" },
    { label: "Average position", value: current.position ? current.position.toFixed(1) : "—", delta: previous.position && current.position ? ((previous.position - current.position) / previous.position) * 100 : null, note: "Lower is better" },
  ];
  const gscMessage: Record<string, string> = {
    connected: "Google connected. Choose the Search Console property for this client.",
    "property-linked": "Search Console property linked successfully. Run the first data sync below.",
    "sync-complete": "GSC performance is up to date.",
    "sync-failed": "The GSC sync failed. Check the latest sync details and your Terminal output.",
    "sync-start-failed": "The sync run could not be created. Confirm migration 0003 has been run.",
    "no-linked-property": "Link a Search Console property before syncing.",
    "no-google-connection": "The linked Google connection could not be found. Reconnect Google.",
    "missing-env": "Google environment variables are missing.",
    "token-exchange-failed": "Google could not complete the connection.",
    "connection-save-failed": "The Google connection could not be saved. Check that migration 0002 has been run.",
    "assign-failed": "The property could not be linked.",
  };

  return (
    <>
      <Link href="/dashboard/clients" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#181818]"><span className="rotate-180"><Icons.arrow className="h-4 w-4" /></span>All clients</Link>
      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="flex items-start gap-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lime-100 text-lg font-bold text-[#181818]">{client.name.slice(0, 2).toUpperCase()}</span><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight text-[#181818] sm:text-4xl">{client.name}</h1><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyle[client.status]}`}>{client.status}</span></div><a href={`https://${client.domain}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#181818]">{client.domain}<Icons.external className="h-3.5 w-3.5" /></a></div></div>
        <div className="flex flex-wrap gap-3"><Link href={`/dashboard/clients/${client.id}/reports/new`} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"><Icons.reports className="h-4 w-4" />Create report</Link>{linkedProperty ? <form action={syncGscPerformance.bind(null, client.id)}><button className="btn-primary" type="submit"><Icons.reports className="h-4 w-4" />Sync GSC data</button></form> : null}<a href={`/api/google/connect?clientId=${client.id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"><Icons.globe className="h-4 w-4" />{linkedProperty ? "Reconnect Google" : "Connect Search Console"}</a></div>
      </div>
      {query.gsc && gscMessage[query.gsc] ? <div className="mt-6 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-slate-800">{gscMessage[query.gsc]}</div> : null}
      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-slate-200"><span className="border-b-2 border-slate-950 px-4 py-3 text-sm font-bold text-[#181818]">Overview</span>{["SEO performance", "Tasks", "Contacts", "Notes", "Settings"].map((tab) => <span key={tab} className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-400">{tab}</span>)}</div>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metricCards.map((metric) => <article key={metric.label} className="app-card p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-slate-500">{metric.label}</p>{rows.length ? <span className={`rounded-full px-2 py-1 text-xs font-bold ${metric.delta !== null && metric.delta < 0 && metric.label !== "Average position" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{formatChange(metric.delta)}</span> : null}</div><p className="mt-3 text-3xl font-bold text-[#181818]">{rows.length ? metric.value : "—"}</p><p className="mt-2 text-xs text-slate-400">{metric.note}</p></article>)}</section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <article className="app-card p-6 sm:p-7"><div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-bold text-slate-900">Organic performance</h2><p className="mt-1 text-sm text-slate-500">Daily clicks and impressions from Google Search Console.</p></div><span className="self-start rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">Last 90 days</span></div><PerformanceChart data={rows.map((row) => ({ date: row.metric_date, clicks: row.clicks, impressions: row.impressions }))} /></article>
        <article className="app-card p-6 sm:p-7"><h2 className="font-bold text-slate-900">Account details</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-400">Monthly fee</dt><dd className="mt-1 font-bold text-slate-800">£{Number(client.monthly_fee ?? 0).toLocaleString()}</dd></div><div><dt className="text-slate-400">Start date</dt><dd className="mt-1 font-bold text-slate-800">{client.start_date ? new Date(`${client.start_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not set"}</dd></div><div><dt className="text-slate-400">GSC connection</dt><dd className={`mt-1 inline-flex items-center gap-2 font-bold ${linkedProperty ? "text-emerald-700" : "text-amber-600"}`}><span className={`h-2 w-2 rounded-full ${linkedProperty ? "bg-emerald-500" : "bg-amber-500"}`} />{linkedProperty ? linkedProperty.site_url : "Not connected"}</dd></div><div><dt className="text-slate-400">Last sync</dt><dd className="mt-1 font-bold text-slate-800">{linkedProperty?.last_synced_at ? new Date(linkedProperty.last_synced_at).toLocaleString("en-GB") : "Never"}</dd></div></dl>
          <div className="mt-6 rounded-xl bg-lime-50 p-4"><p className="text-sm font-bold text-slate-900">Search Console property</p>{availableProperties?.length ? <form action={assignGscProperty.bind(null, client.id)} className="mt-3 space-y-3"><select name="propertyId" defaultValue={linkedProperty?.id ?? ""} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"><option value="" disabled>Choose a property</option>{availableProperties.map((property) => <option key={property.id} value={property.id}>{property.site_url}</option>)}</select><button className="btn-primary w-full justify-center" type="submit">Link property</button></form> : <p className="mt-1 text-sm leading-6 text-[#181818]">Connect Google to retrieve the properties available to your account.</p>}</div>
          {lastSync ? <div className="mt-4 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-900">Latest sync</p><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${lastSync.status === "completed" ? "bg-emerald-50 text-emerald-700" : lastSync.status === "failed" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{lastSync.status}</span></div><p className="mt-2 text-xs text-slate-500">{lastSync.status === "completed" ? `${lastSync.rows_imported} daily rows imported` : lastSync.error_message ?? "Sync in progress"}</p></div> : null}
        </article>
      </section>
      <AnalysisSection
        clientId={client.id}
        type={analysisType}
        filter={analysisFilter}
        metrics={((dimensionData ?? []).map((row) => ({
          dimension_value: row.dimension_value,
          period_key: row.period_key,
          clicks: Number(row.clicks),
          impressions: Number(row.impressions),
          ctr: Number(row.ctr),
          position: Number(row.position),
        })) as DimensionMetric[])}
      />
    </>
  );
}
