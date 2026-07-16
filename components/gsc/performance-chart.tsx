"use client";

type Point = {
  date: string;
  clicks: number;
  impressions: number;
};

function linePath(values: number[], width: number, height: number, max: number) {
  if (!values.length) return "";
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / Math.max(max, 1)) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function PerformanceChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return (
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-[#f4f1e9]">
        <div className="text-center">
          <p className="font-bold text-slate-800">No performance data yet</p>
          <p className="mt-1 text-sm text-slate-500">Run the first GSC sync to populate this chart.</p>
        </div>
      </div>
    );
  }

  const width = 760;
  const height = 220;
  const clicks = data.map((point) => point.clicks);
  const impressions = data.map((point) => point.impressions);
  const clicksMax = Math.max(...clicks, 1);
  const impressionsMax = Math.max(...impressions, 1);
  const start = new Date(`${data[0].date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const end = new Date(`${data[data.length - 1].date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-5 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#181818]" />Clicks</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#b8ff3d] ring-1 ring-slate-300" />Impressions</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f4f1e9] p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" role="img" aria-label="Clicks and impressions over time" preserveAspectRatio="none">
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <line key={fraction} x1="0" x2={width} y1={height * fraction} y2={height * fraction} stroke="currentColor" className="text-slate-200" strokeWidth="1" />
          ))}
          <path d={linePath(impressions, width, height, impressionsMax)} fill="none" stroke="#b8ff3d" strokeWidth="5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          <path d={linePath(clicks, width, height, clicksMax)} fill="none" stroke="#181818" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <div className="mt-2 flex justify-between text-xs font-semibold text-slate-400"><span>{start}</span><span>{end}</span></div>
      </div>
    </div>
  );
}
