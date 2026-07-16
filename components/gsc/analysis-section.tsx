import Link from "next/link";
import { Icons } from "@/components/ui/icons";

export type DimensionMetric = {
  dimension_value: string;
  period_key: "current" | "previous";
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type AnalysisRow = {
  value: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  previousClicks: number;
  clickDelta: number;
  positionDelta: number | null;
};

function buildRows(metrics: DimensionMetric[]): AnalysisRow[] {
  const previous = new Map(metrics.filter((row) => row.period_key === "previous").map((row) => [row.dimension_value, row]));
  return metrics
    .filter((row) => row.period_key === "current")
    .map((row) => {
      const before = previous.get(row.dimension_value);
      return {
        value: row.dimension_value,
        clicks: Number(row.clicks),
        impressions: Number(row.impressions),
        ctr: Number(row.ctr),
        position: Number(row.position),
        previousClicks: Number(before?.clicks ?? 0),
        clickDelta: Number(row.clicks) - Number(before?.clicks ?? 0),
        positionDelta: before?.position ? Number(before.position) - Number(row.position) : null,
      };
    });
}

function CompactList({ title, description, rows, empty }: { title: string; description: string; rows: AnalysisRow[]; empty: string }) {
  return <article className="app-card p-5">
    <h3 className="font-bold text-slate-900">{title}</h3>
    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    <div className="mt-4 space-y-3">
      {rows.length ? rows.slice(0, 5).map((row) => <div key={row.value} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
        <p className="min-w-0 truncate text-sm font-semibold text-slate-800" title={row.value}>{row.value}</p>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${row.clickDelta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{row.clickDelta > 0 ? "+" : ""}{row.clickDelta.toLocaleString("en-GB")}</span>
      </div>) : <p className="py-5 text-sm text-slate-400">{empty}</p>}
    </div>
  </article>;
}

export function AnalysisSection({ clientId, type, filter, metrics }: { clientId: string; type: "query" | "page"; filter: string; metrics: DimensionMetric[] }) {
  const baseRows = buildRows(metrics);
  const search = filter.trim().toLowerCase();
  const rows = baseRows.filter((row) => !search || row.value.toLowerCase().includes(search));
  const winners = [...rows].filter((row) => row.clickDelta > 0).sort((a, b) => b.clickDelta - a.clickDelta);
  const losers = [...rows].filter((row) => row.clickDelta < 0).sort((a, b) => a.clickDelta - b.clickDelta);
  const nearPageOne = [...rows].filter((row) => row.position >= 8 && row.position <= 20 && row.impressions >= 20).sort((a, b) => b.impressions - a.impressions);
  const ctrOpportunities = [...rows].filter((row) => row.impressions >= 100 && row.position <= 10 && row.ctr < 0.03).sort((a, b) => b.impressions - a.impressions);
  const topRows = [...rows].sort((a, b) => b.clicks - a.clicks).slice(0, 50);
  const exportUrl = `/api/gsc/export?clientId=${encodeURIComponent(clientId)}&type=${type}`;

  return <section className="mt-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-bold text-[#181818]">Search analysis</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-[#181818]">Queries and landing pages</h2><p className="mt-2 text-sm text-slate-500">Current 28 days compared with the preceding 28 days.</p></div>
      <a className="btn-secondary self-start" href={exportUrl}><Icons.external className="h-4 w-4" />Export CSV</a>
    </div>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex self-start rounded-xl border border-black/10 bg-white p-1">
        <Link href={`/dashboard/clients/${clientId}?analysis=query${filter ? `&filter=${encodeURIComponent(filter)}` : ""}#analysis`} className={`rounded-lg px-4 py-2 text-sm font-bold ${type === "query" ? "bg-[#181818] text-white" : "text-slate-500 hover:text-slate-900"}`}>Queries</Link>
        <Link href={`/dashboard/clients/${clientId}?analysis=page${filter ? `&filter=${encodeURIComponent(filter)}` : ""}#analysis`} className={`rounded-lg px-4 py-2 text-sm font-bold ${type === "page" ? "bg-[#181818] text-white" : "text-slate-500 hover:text-slate-900"}`}>Landing pages</Link>
      </div>
      <form className="flex w-full max-w-md gap-2" action={`/dashboard/clients/${clientId}`}>
        <input type="hidden" name="analysis" value={type} />
        <div className="relative flex-1"><Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="filter" defaultValue={filter} placeholder={`Filter ${type === "query" ? "queries" : "URLs"}`} className="w-full rounded-xl border border-black/15 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black focus:ring-4 focus:ring-lime-300/30" /></div>
        <button className="btn-primary" type="submit">Filter</button>
      </form>
    </div>
    <div id="analysis" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <CompactList title="Biggest winners" description="Largest click gains versus the previous period." rows={winners} empty="No gains in this data set." />
      <CompactList title="Biggest declines" description="Largest click losses versus the previous period." rows={losers} empty="No declines in this data set." />
      {type === "query" ? <CompactList title="Near page one" description="Keywords averaging positions 8–20 with meaningful impressions." rows={nearPageOne} empty="No near-page-one opportunities found." /> : <CompactList title="Improving pages" description="Landing pages with the strongest click growth." rows={winners.filter((row) => (row.positionDelta ?? 0) > 0)} empty="No improving pages found." />}
      {type === "query" ? <CompactList title="CTR opportunities" description="High-impression top-10 queries with CTR below 3%." rows={ctrOpportunities} empty="No clear CTR opportunities found." /> : <CompactList title="Declining pages" description="Pages losing clicks and visibility." rows={losers.filter((row) => (row.positionDelta ?? 0) < 0)} empty="No declining pages found." />}
    </div>
    <article className="app-card mt-5 overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6"><h3 className="font-bold text-slate-900">Top {type === "query" ? "queries" : "landing pages"}</h3><p className="mt-1 text-sm text-slate-500">Showing up to 50 rows ordered by clicks.</p></div>
      {topRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#f4f1e9]/70 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-6 py-3.5 font-bold">{type === "query" ? "Query" : "Landing page"}</th><th className="px-4 py-3.5 text-right font-bold">Clicks</th><th className="px-4 py-3.5 text-right font-bold">Change</th><th className="px-4 py-3.5 text-right font-bold">Impressions</th><th className="px-4 py-3.5 text-right font-bold">CTR</th><th className="px-6 py-3.5 text-right font-bold">Position</th></tr></thead><tbody className="divide-y divide-slate-100">{topRows.map((row) => <tr key={row.value} className="hover:bg-[#f4f1e9]/60"><td className="max-w-xl truncate px-6 py-4 font-semibold text-slate-800" title={row.value}>{row.value}</td><td className="px-4 py-4 text-right font-bold text-slate-900">{row.clicks.toLocaleString("en-GB")}</td><td className={`px-4 py-4 text-right font-bold ${row.clickDelta > 0 ? "text-emerald-700" : row.clickDelta < 0 ? "text-rose-700" : "text-slate-400"}`}>{row.clickDelta > 0 ? "+" : ""}{row.clickDelta.toLocaleString("en-GB")}</td><td className="px-4 py-4 text-right text-slate-600">{row.impressions.toLocaleString("en-GB")}</td><td className="px-4 py-4 text-right text-slate-600">{(row.ctr * 100).toFixed(1)}%</td><td className="px-6 py-4 text-right text-slate-600">{row.position.toFixed(1)}</td></tr>)}</tbody></table></div> : <div className="px-6 py-14 text-center text-sm text-slate-400">No matching data. Run a fresh GSC sync after migration 0004.</div>}
    </article>
  </section>;
}
