"use client";

type Point = { date: string; clicks: number; sessions: number };

const W = 760, H = 220, L = 52, R = 14, T = 12, B = 34;
const PW = W - L - R, PH = H - T - B;

function compact(value: number) {
  return new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
function dateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function path(data: Point[], key: "clicks" | "sessions", max: number) {
  return data.map((p, i) => {
    const x = L + (data.length === 1 ? PW / 2 : (i / (data.length - 1)) * PW);
    const y = T + PH - (p[key] / Math.max(max, 1)) * PH;
    return `${i ? "L" : "M"}${x},${y}`;
  }).join(" ");
}

export function CombinedPerformanceChart({ data }: { data: Point[] }) {
  if (!data.length) return <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-[#f4f1e9] text-sm text-slate-500">No combined data available for this period.</div>;
  const max = Math.max(...data.flatMap((p) => [p.clicks, p.sessions]), 1);
  const ticks = [0, .25, .5, .75, 1];
  const dateIndexes = Array.from(new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]));
  return <div>
    <div className="mb-4 flex flex-wrap gap-5 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#181818]"/>GSC clicks</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#b8ff3d] ring-1 ring-slate-300"/>GA4 organic sessions</span></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f4f1e9] p-4"><svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full" preserveAspectRatio="none" role="img" aria-label="Google Search Console clicks compared with GA4 organic sessions">
      {ticks.map((f) => { const y = T + PH * f; return <g key={f}><line x1={L} x2={W-R} y1={y} y2={y} stroke="currentColor" className="text-slate-200"/><text x={L-9} y={y} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px]">{compact(max*(1-f))}</text></g>; })}
      {dateIndexes.map((i) => { const x=L+(data.length===1?PW/2:(i/(data.length-1))*PW); return <text key={i} x={x} y={H-7} textAnchor="middle" className="fill-slate-500 text-[11px]">{dateLabel(data[i].date)}</text>; })}
      <path d={path(data,"sessions",max)} fill="none" stroke="#b8ff3d" strokeWidth="5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={path(data,"clicks",max)} fill="none" stroke="#181818" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
    </svg></div>
  </div>;
}
