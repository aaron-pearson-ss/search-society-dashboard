import Image from "next/image";
import { PerformanceChart } from "@/components/gsc/performance-chart";
import { CombinedPerformanceChart } from "@/components/reports/combined-performance-chart";
import { aggregateGa4Metrics, aggregateMetrics, formatDelta, mergeSearchAndAnalytics, percentChange, type DailyMetric, type Ga4DailyMetric } from "@/lib/reporting";

export type ReportRecord = {
  title: string; date_from: string; date_to: string; comparison_date_from: string; comparison_date_to: string;
  executive_summary: string; work_completed: string; next_steps: string; status: string;
};
type DimensionRow = { dimension_value: string; clicks: number; impressions: number; ctr: number; position: number };

type Props = { report: ReportRecord; client: { name: string; domain: string }; currentRows: DailyMetric[]; previousRows: DailyMetric[]; currentGa4Rows: Ga4DailyMetric[]; previousGa4Rows: Ga4DailyMetric[]; topQueries: DimensionRow[]; topPages: DimensionRow[] };

export function ReportDocument({ report, client, currentRows, previousRows, currentGa4Rows, previousGa4Rows, topQueries, topPages }: Props) {
  const current = aggregateMetrics(currentRows); const previous = aggregateMetrics(previousRows);
  const currentGa4 = aggregateGa4Metrics(currentGa4Rows); const previousGa4 = aggregateGa4Metrics(previousGa4Rows);
  const searchCards = [
    ["GSC clicks", current.clicks.toLocaleString("en-GB"), percentChange(current.clicks, previous.clicks)],
    ["Impressions", current.impressions.toLocaleString("en-GB"), percentChange(current.impressions, previous.impressions)],
    ["CTR", `${(current.ctr * 100).toFixed(1)}%`, percentChange(current.ctr, previous.ctr)],
    ["Average position", current.position ? current.position.toFixed(1) : "—", percentChange(current.position, previous.position, true)],
  ] as const;
  const analyticsCards = [
    ["Organic sessions", currentGa4.sessions.toLocaleString("en-GB"), percentChange(currentGa4.sessions, previousGa4.sessions)],
    ["Active users", currentGa4.activeUsers.toLocaleString("en-GB"), percentChange(currentGa4.activeUsers, previousGa4.activeUsers)],
    ["Engagement rate", `${(currentGa4.engagementRate * 100).toFixed(1)}%`, percentChange(currentGa4.engagementRate, previousGa4.engagementRate)],
    ["Key events", currentGa4.keyEvents.toLocaleString("en-GB", { maximumFractionDigits: 1 }), percentChange(currentGa4.keyEvents, previousGa4.keyEvents)],
  ] as const;
  const period = `${new Date(`${report.date_from}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(`${report.date_to}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  const combined = mergeSearchAndAnalytics(currentRows, currentGa4Rows);
  return <article className="report-document mx-auto max-w-6xl bg-[#f4f1e9] text-[#181818]">
    <header className="rounded-[2rem] bg-[#181818] p-8 text-white sm:p-12"><Image src="/search-society-logo.png" alt="Search Society" width={960} height={192} className="h-9 w-auto brightness-0 invert" /><p className="mt-12 text-sm font-bold uppercase tracking-[0.22em] text-lime-400">Organic search & analytics performance</p><h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">{report.title}</h1><div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-300"><span>{client.name}</span><span>{client.domain}</span><span>{period}</span></div></header>
    <SectionHeading eyebrow="Search visibility" title="Google Search Console" />
    <MetricGrid cards={searchCards} />
    <SectionHeading eyebrow="Website outcomes" title="Google Analytics 4" />
    <MetricGrid cards={analyticsCards} empty={!currentGa4Rows.length} />
    <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8"><h2 className="text-xl font-bold">Search demand to website traffic</h2><p className="mt-1 text-sm text-slate-500">GSC clicks compared with GA4 organic sessions across the report period.</p><div className="mt-7"><CombinedPerformanceChart data={combined} /></div></section>
    <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8"><h2 className="text-xl font-bold">Search visibility trend</h2><p className="mt-1 text-sm text-slate-500">Daily clicks and impressions during the report period.</p><div className="mt-7"><PerformanceChart data={currentRows.map((row) => ({ date: row.metric_date, clicks: Number(row.clicks), impressions: Number(row.impressions) }))} /></div></section>
    <section className="mt-8 grid gap-6 lg:grid-cols-3">{[["Executive summary", report.executive_summary, "Add a concise interpretation of the results."],["Work completed", report.work_completed, "Record the activity delivered during this period."],["Next steps", report.next_steps, "Set out the priorities for the coming month."]].map(([heading, body, empty]) => <div key={heading} className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">{heading}</h2><p className={`mt-4 whitespace-pre-line text-sm leading-7 ${body ? "text-slate-700" : "italic text-slate-400"}`}>{body || empty}</p></div>)}</section>
    <section className="mt-8 grid gap-6 lg:grid-cols-2"><DataTable title="Top search queries" rows={topQueries} valueLabel="Query" /><DataTable title="Top landing pages" rows={topPages} valueLabel="Page" /></section>
    <footer className="mt-8 border-t border-slate-300 py-6 text-xs text-slate-500">Prepared by Search Society · Data sourced from Google Search Console and Google Analytics 4.</footer>
  </article>;
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div className="mt-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p><h2 className="mt-1 text-2xl font-bold">{title}</h2></div>; }
function MetricGrid({ cards, empty = false }: { cards: readonly (readonly [string, string, number | null])[]; empty?: boolean }) { return <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value, delta]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{empty ? "—" : value}</p><p className={`mt-2 text-xs font-bold ${delta !== null && delta < 0 ? "text-rose-600" : "text-emerald-700"}`}>{empty ? "GA4 not linked" : `${formatDelta(delta)} vs comparison`}</p></div>)}</section>; }
function DataTable({ title, rows, valueLabel }: { title: string; rows: DimensionRow[]; valueLabel: string }) { return <div className="overflow-hidden rounded-3xl bg-white shadow-sm"><div className="p-6"><h2 className="text-lg font-bold">{title}</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">{valueLabel}</th><th className="px-3 py-3 text-right">Clicks</th><th className="px-3 py-3 text-right">Impr.</th><th className="px-6 py-3 text-right">Pos.</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row) => <tr key={row.dimension_value}><td className="max-w-[300px] truncate px-6 py-3 font-semibold text-slate-800" title={row.dimension_value}>{row.dimension_value}</td><td className="px-3 py-3 text-right">{Number(row.clicks).toLocaleString("en-GB")}</td><td className="px-3 py-3 text-right">{Number(row.impressions).toLocaleString("en-GB")}</td><td className="px-6 py-3 text-right">{Number(row.position).toFixed(1)}</td></tr>) : <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No data available.</td></tr>}</tbody></table></div></div>; }
