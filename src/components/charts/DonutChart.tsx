/** Donut SVG serveur — V7 Overall Stats, % au centre. */
export function DonutChart({ pct, size = 150 }: { pct: number; size?: number }) {
  const stroke = size * 0.15;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="chart chart--donut" role="img" aria-label={`Overall ${Math.round(clamped * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="donut__track" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeDasharray={`${clamped * c} ${c}`}
        strokeLinecap="butt"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="donut__value"
      />
      <text x="50%" y="50%" dy="0.36em" textAnchor="middle" className="donut__pct">
        {Math.round(clamped * 100)}%
      </text>
    </svg>
  );
}
