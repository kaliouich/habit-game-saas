/** Bar chart SVG serveur — style N&B de la vidéo (V4 Daily / V5 Weekly). */
interface BarChartProps {
  values: (number | null)[]; // 0..1, null = pas de barre (futur)
  labels: string[]; // même longueur
  height?: number;
  labelEvery?: number; // n'afficher qu'un label sur n
  highlightIndex?: number; // ex. aujourd'hui
}

export function BarChart({ values, labels, height = 110, labelEvery = 1, highlightIndex }: BarChartProps) {
  const n = values.length;
  const axisW = 30;
  const labelH = 26;
  const gap = 2;
  const barW = 12;
  const width = axisW + n * (barW + gap);
  const chartH = height - labelH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="chart chart--bar"
      role="img"
      aria-label="Bar chart"
      preserveAspectRatio="none"
    >
      {yTicks.map((t) => (
        <g key={t}>
          <text x={axisW - 4} y={chartH - t * chartH + 3} textAnchor="end" className="chart__tick">
            {Math.round(t * 100)}%
          </text>
          <line
            x1={axisW}
            x2={width}
            y1={chartH - t * chartH}
            y2={chartH - t * chartH}
            className="chart__gridline"
          />
        </g>
      ))}
      {values.map((v, i) => {
        const x = axisW + i * (barW + gap);
        if (v === null) return null;
        const h = Math.max(v * chartH, v > 0 ? 2 : 0);
        return (
          <rect
            key={i}
            x={x}
            y={chartH - h}
            width={barW}
            height={h}
            className={i === highlightIndex ? "chart__bar chart__bar--highlight" : "chart__bar"}
          >
            <title>{`${labels[i]} — ${Math.round(v * 100)}%`}</title>
          </rect>
        );
      })}
      {labels.map((label, i) =>
        i % labelEvery === 0 ? (
          <text
            key={i}
            x={axisW + i * (barW + gap) + barW / 2}
            y={height - 14}
            textAnchor="middle"
            className="chart__label"
            transform={`rotate(-55 ${axisW + i * (barW + gap) + barW / 2} ${height - 14})`}
          >
            {label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
