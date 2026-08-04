interface TrendChartProps {
  /** Complétion 0..1, un point par jour de la période. */
  values: number[];
  labels: string[];
  height?: number;
}

/**
 * Aire de tendance pour le rapport. Rendu serveur, SVG pur (imprimable, pas de
 * JS). `preserveAspectRatio="none"` fait que le graphe s'étire sur toute la
 * largeur quel que soit le nombre de jours — 7 comme 365.
 */
export function TrendChart({ values, labels, height = 120 }: TrendChartProps) {
  const n = values.length;
  if (n === 0) return null;

  const axisW = 26;
  const labelH = 16;
  const topPad = 8;
  const plotW = 300;
  const chartH = height - labelH - topPad;
  const bottom = topPad + chartH;

  const x = (i: number) => (n === 1 ? axisW + plotW / 2 : axisW + (i / (n - 1)) * plotW);
  const y = (v: number) => bottom - v * chartH;

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)} ${bottom} L${x(0).toFixed(1)} ${bottom} Z`;

  const avg = values.reduce((a, b) => a + b, 0) / n;

  // Au plus ~8 étiquettes : au-delà elles se chevauchent sur une année.
  const every = Math.max(1, Math.ceil(n / 8));

  return (
    <svg
      viewBox={`0 0 ${axisW + plotW} ${height}`}
      className="chart trendchart"
      role="img"
      aria-label={`Completion trend, average ${Math.round(avg * 100)}%`}
      preserveAspectRatio="none"
    >
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={axisW} x2={axisW + plotW} y1={y(t)} y2={y(t)} className="chart__gridline" />
          <text x={axisW - 4} y={y(t) + 3} textAnchor="end" className="chart__tick">
            {t * 100}%
          </text>
        </g>
      ))}

      <path d={area} className="trendchart__area" />
      <path d={line} className="trendchart__line" fill="none" />

      {/* Moyenne de la période — donne un repère au lecteur du PDF. */}
      <line
        x1={axisW}
        x2={axisW + plotW}
        y1={y(avg)}
        y2={y(avg)}
        className="trendchart__avg"
      />

      {labels.map((l, i) =>
        i % every === 0 ? (
          <text key={i} x={x(i)} y={height - 4} textAnchor="middle" className="chart__label">
            {l}
          </text>
        ) : null,
      )}
    </svg>
  );
}
