// Server-only single-series line chart. Provides x-axis labels, y-axis
// gridlines, and a stroke. Used on deck pages to show appearance share over
// time within a season.

export type LineChartPoint = { x: string; y: number };

export function LineChart({
  points,
  width = 560,
  height = 180,
  stroke = "currentColor",
  yLabel,
  caption,
}: {
  points: LineChartPoint[];
  width?: number;
  height?: number;
  stroke?: string;
  yLabel?: string;
  caption?: string;
}) {
  if (points.length === 0) {
    return (
      <div className="text-sm text-ink-dim italic">No data points yet.</div>
    );
  }

  const padX = 32;
  const padY = 20;
  const w = width;
  const h = height;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const ys = points.map((p) => p.y);
  const minY = 0;
  const maxY = Math.max(1, ...ys);

  const xFor = (i: number) =>
    padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yFor = (v: number) => padY + (1 - (v - minY) / (maxY - minY || 1)) * innerH;

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(2)},${yFor(p.y).toFixed(2)}`)
    .join(" ");
  const areaD =
    `${d} L${xFor(points.length - 1).toFixed(2)},${(padY + innerH).toFixed(2)} L${xFor(0).toFixed(2)},${(padY + innerH).toFixed(2)} Z`;

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxY * i) / yTicks));

  // Label every Nth x-tick to keep the axis readable.
  const xTickStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="block">
        {/* y gridlines + labels */}
        {ticks.map((t, i) => {
          const y = yFor(t);
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="currentColor" strokeOpacity="0.08" />
              <text
                x={padX - 6}
                y={y + 3}
                fontSize="10"
                textAnchor="end"
                className="fill-current text-ink-dim"
              >
                {t}
              </text>
            </g>
          );
        })}
        {/* x labels */}
        {points.map((p, i) => {
          if (i % xTickStep !== 0 && i !== points.length - 1) return null;
          return (
            <text
              key={i}
              x={xFor(i)}
              y={h - 4}
              fontSize="10"
              textAnchor="middle"
              className="fill-current text-ink-dim"
            >
              {p.x}
            </text>
          );
        })}
        <path d={areaD} fill={stroke} fillOpacity="0.18" stroke="none" />
        <path d={d} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={xFor(i)} cy={yFor(p.y)} r="2.2" fill={stroke} />
        ))}
      </svg>
      {(caption || yLabel) && (
        <div className="px-4 pb-3 flex items-center justify-between text-[10px] text-ink-dim tabular">
          {yLabel ? <span>{yLabel}</span> : <span />}
          {caption ? <span>{caption}</span> : <span />}
        </div>
      )}
    </div>
  );
}
