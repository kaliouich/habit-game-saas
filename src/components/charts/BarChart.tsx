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
  // Room above the chart for the "100%" tick label's ascent — at chart__tick's
  // font-size, a baseline flush with y=0 clips the glyph against the
  // viewBox top edge. Without this the top tick is invisible, not just tight.
  const topPad = 8;
  // Largeur de canevas FIXE, indépendante de n : avec une largeur dérivée de
  // n*(barW+gap) (l'ancien calcul), un viewBox étroit (6 barres hebdo) étiré
  // par le CSS à 100% de la largeur réelle du panneau (~350-380px) gonflait
  // tout le texte SVG d'un facteur ~3x — les tick/label 7px/6.5px du CSS
  // rendaient à ~21-23px effectifs. En gardant le viewBox proche de la
  // largeur réelle quel que soit n (6 barres hebdo, ~30 quotidien), le
  // facteur d'étirement reste proche de 1:1 et les tailles du CSS
  // s'appliquent presque telles quelles.
  const width = 340;
  const gap = Math.max(1.5, Math.min(8, ((width - axisW) / n) * 0.15));
  const barW = (width - axisW) / n - gap;
  const chartH = height - labelH - topPad;
  const chartBottom = topPad + chartH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="chart chart--bar"
      role="img"
      aria-label="Bar chart"
      preserveAspectRatio="none"
      // Hauteur explicite : sans elle, un <svg> avec viewBox mais sans
      // width/height CSS retombe sur le ratio intrinsèque du viewBox pour
      // calculer sa boîte (indépendamment de preserveAspectRatio, qui ne
      // régit que le contenu DANS la boîte) — un ratio ~114:90 étiré à la
      // largeur du panneau donnait un graphique ~3x plus haut que prévu.
      style={{ height }}
    >
      {yTicks.map((t) => {
        const y = chartBottom - t * chartH;
        return (
          <g key={t}>
            <text x={axisW - 4} y={y + 3} textAnchor="end" className="chart__tick">
              {Math.round(t * 100)}%
            </text>
            <line x1={axisW} x2={width} y1={y} y2={y} className="chart__gridline" />
          </g>
        );
      })}
      {values.map((v, i) => {
        const x = axisW + i * (barW + gap);
        if (v === null) return null;
        const h = Math.max(v * chartH, v > 0 ? 2 : 0);
        return (
          <rect
            key={i}
            x={x}
            y={chartBottom - h}
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
