"use client";

type Point = {
  date: string;
  sessions: number;
  users: number;
};

type ChartPoint = Point & {
  x: number;
  sessionsY: number;
  usersY: number;
};

const WIDTH = 760;
const HEIGHT = 220;
const LEFT_PADDING = 54;
const RIGHT_PADDING = 12;
const TOP_PADDING = 12;
const BOTTOM_PADDING = 34;

const plotWidth = WIDTH - LEFT_PADDING - RIGHT_PADDING;
const plotHeight = HEIGHT - TOP_PADDING - BOTTOM_PADDING;

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function createPath(
  points: ChartPoint[],
  key: "sessionsY" | "usersY"
) {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${point.x},${point[key]}`;
    })
    .join(" ");
}

export function TrafficChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return (
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-[#f4f1e9]">
        <div className="text-center">
          <p className="font-bold text-slate-800">No GA4 data yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Link a property and run the first sync.
          </p>
        </div>
      </div>
    );
  }

  const maximumValue = Math.max(
    ...data.map((point) => Math.max(point.sessions, point.users)),
    1
  );

  const points: ChartPoint[] = data.map((point, index) => {
    const x =
      LEFT_PADDING +
      (data.length === 1
        ? plotWidth / 2
        : (index / (data.length - 1)) * plotWidth);

    const sessionsY =
      TOP_PADDING +
      plotHeight -
      (point.sessions / maximumValue) * plotHeight;

    const usersY =
      TOP_PADDING +
      plotHeight -
      (point.users / maximumValue) * plotHeight;

    return {
      ...point,
      x,
      sessionsY,
      usersY,
    };
  });

  const gridFractions = [0, 0.25, 0.5, 0.75, 1];

  const dateTickIndexes = Array.from(
    new Set([
      0,
      Math.floor((data.length - 1) * 0.25),
      Math.floor((data.length - 1) * 0.5),
      Math.floor((data.length - 1) * 0.75),
      data.length - 1,
    ])
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-5 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#181818]" />
          Organic sessions
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#b8ff3d] ring-1 ring-slate-300" />
          Active users
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f4f1e9] p-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-64 w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="Organic sessions and active users over time"
        >
          {gridFractions.map((fraction) => {
            const y = TOP_PADDING + plotHeight * fraction;
            const value = maximumValue * (1 - fraction);

            return (
              <g key={fraction}>
                <line
                  x1={LEFT_PADDING}
                  x2={WIDTH - RIGHT_PADDING}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200"
                />

                <text
                  x={LEFT_PADDING - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-slate-500 text-[11px]"
                >
                  {formatNumber(value)}
                </text>
              </g>
            );
          })}

          <line
            x1={LEFT_PADDING}
            x2={LEFT_PADDING}
            y1={TOP_PADDING}
            y2={TOP_PADDING + plotHeight}
            stroke="currentColor"
            className="text-slate-300"
          />

          <line
            x1={LEFT_PADDING}
            x2={WIDTH - RIGHT_PADDING}
            y1={TOP_PADDING + plotHeight}
            y2={TOP_PADDING + plotHeight}
            stroke="currentColor"
            className="text-slate-300"
          />

          {dateTickIndexes.map((index) => {
            const point = points[index];

            return (
              <g key={`${point.date}-${index}`}>
                <line
                  x1={point.x}
                  x2={point.x}
                  y1={TOP_PADDING + plotHeight}
                  y2={TOP_PADDING + plotHeight + 5}
                  stroke="currentColor"
                  className="text-slate-300"
                />

                <text
                  x={point.x}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px]"
                >
                  {formatDate(point.date)}
                </text>
              </g>
            );
          })}

          <path
            d={createPath(points, "usersY")}
            fill="none"
            stroke="#b8ff3d"
            strokeWidth="5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={createPath(points, "sessionsY")}
            fill="none"
            stroke="#181818"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="mt-2 flex justify-between text-xs font-semibold text-slate-400">
        <span>Sessions / users</span>
        <span>Date</span>
      </div>
    </div>
  );
}
