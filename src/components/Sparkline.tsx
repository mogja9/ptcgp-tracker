// Tiny SVG sparkline. Server-only - just emits a <svg>.
// Useful for showing a player's best-10 point distribution at a glance.

export function Sparkline({
  values,
  width = 64,
  height = 18,
  stroke = "currentColor",
  fill = "none",
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
}) {
  if (!values || values.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeDasharray="2 2"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const pad = 1.5;

  const points = values.map((v, i) => {
    const x = pad + (i / (n - 1)) * (width - 2 * pad);
    const y = pad + (1 - (v - min) / span) * (height - 2 * pad);
    return [x, y];
  });
  const d = points
    .map(([x, y], i) => (i === 0 ? `M${x.toFixed(2)},${y.toFixed(2)}` : `L${x.toFixed(2)},${y.toFixed(2)}`))
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];

  // Use a soft area fill below the stroke for legibility.
  const areaD =
    `${d} L${last[0].toFixed(2)},${(height - pad).toFixed(2)} L${first[0].toFixed(2)},${(height - pad).toFixed(2)} Z`;

  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <path d={areaD} fill={stroke} fillOpacity="0.15" stroke="none" />
      <path d={d} stroke={stroke} strokeWidth={1.4} fill={fill} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={1.6} fill={stroke} />
    </svg>
  );
}
