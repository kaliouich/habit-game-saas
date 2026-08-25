/** Line chart SVG serveur — V10 mood (+ motivation) du mois (valeurs 1..5, trous autorisés). */
export interface LineSeries {
  values: (number | null)[]; // index = jour-1
  /** Couleur CSS (ex. "var(--check)") — surcharge .line__stroke/.line__dot par série. */
  color: string;
}

interface LineChartProps {
  series: LineSeries[];
  min?: number;
  max?: number;
  height?: number;
}

export function LineChart({ series, min = 1, max = 5, height = 60 }: LineChartProps) {
  const n = series[0]?.values.length ?? 0;
  const stepX = 10;
  const width = (n - 1) * stepX + 8;
  const padY = 6;
  const y = (v: number) => height - padY - ((v - min) / (max - min)) * (height - 2 * padY);
  const x = (i: number) => 4 + i * stepX;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart chart--line" role="img" aria-label="Wellness chart" preserveAspectRatio="none">
      {series.map((s, si) => {
        // Relie TOUS les jours renseignés en une seule ligne, même non consécutifs
        // — un trou (jour sans valeur) est sauté, pas une coupure de tracé.
        const points = s.values
          .map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
          .filter((p): p is string => p !== null);
        if (points.length < 2) return null;
        return <polyline key={si} points={points.join(" ")} fill="none" className="line__stroke" style={{ stroke: s.color }} />;
      })}
      {series.map((s, si) =>
        s.values.map((v, i) =>
          v === null ? null : (
            <circle key={`${si}-${i}`} cx={x(i)} cy={y(v)} r={1.8} className="line__dot" style={{ fill: s.color }} />
          ),
        ),
      )}
    </svg>
  );
}
