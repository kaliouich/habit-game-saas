/** Line chart SVG serveur — V10 mood du mois (valeurs 1..5, trous autorisés). */
interface LineChartProps {
  values: (number | null)[]; // index = jour-1
  min?: number;
  max?: number;
  height?: number;
}

export function LineChart({ values, min = 1, max = 5, height = 60 }: LineChartProps) {
  const n = values.length;
  const stepX = 10;
  const width = (n - 1) * stepX + 8;
  const padY = 6;
  const y = (v: number) => height - padY - ((v - min) / (max - min)) * (height - 2 * padY);
  const x = (i: number) => 4 + i * stepX;

  // Segments continus entre jours consécutifs renseignés
  const segments: string[] = [];
  let current: string[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
    } else {
      current.push(`${x(i)},${y(v)}`);
    }
  });
  if (current.length > 1) segments.push(current.join(" "));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart chart--line" role="img" aria-label="Mood chart" preserveAspectRatio="none">
      {segments.map((points, i) => (
        <polyline key={i} points={points} fill="none" className="line__stroke" />
      ))}
      {values.map((v, i) =>
        v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={1.8} className="line__dot" />,
      )}
    </svg>
  );
}
