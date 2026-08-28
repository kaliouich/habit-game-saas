/** Bar chart serveur — style N&B de la vidéo (V4 Daily / V5 Weekly). */
interface BarChartProps {
  values: (number | null)[]; // 0..1, null = pas de barre (futur)
  labels: string[]; // même longueur
  height?: number;
  labelEvery?: number; // n'afficher qu'un label sur n — auto-calculé si omis (voir minLabelSpacing)
  highlightIndex?: number; // ex. aujourd'hui
}

const AXIS_W = 34; // px réels, colonne des labels % à gauche
const X_AXIS_H = 28; // px réels, bande des labels jour/semaine en bas
// Marge en haut : le tick "100%" est centré sur sa ligne (translateY(50%)) —
// sans cette marge, sa moitié supérieure déborde au-dessus du graphique et
// se fait rogner par le titre du panneau.
const TOP_PAD = 9;

export function BarChart({ values, labels, height = 110, labelEvery, highlightIndex }: BarChartProps) {
  const n = values.length;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  // Tout vit désormais en pourcentages d'un repère 0..100 — la géométrie
  // (barres, quadrillage) peut s'étirer librement à la largeur réelle du
  // panneau (mobile étroit ou .dashboard__main large sur desktop), c'est
  // voulu. Le texte, lui, ne vit plus dans ce SVG : historiquement, un
  // viewBox à échelle fixe étiré par le CSS gonflait tout le texte SVG
  // (jusqu'à ~4x sur un panneau large) — ou, plafonné à une largeur fixe,
  // laissait un vide disgracieux sur grand écran. Labels et ticks sont
  // maintenant des <span> HTML positionnés en %, à taille de police réelle
  // et fixe, immunisés contre l'étirement du graphique.
  const gapPct = Math.max(1.5, Math.min(6, (100 / n) * 0.12));
  const barWPct = 100 / n - gapPct;

  // Espacement minimal (px, approximatif) entre deux labels affichés pour
  // rester lisibles à -55°/10px sans se chevaucher — l'hebdo (n=6) n'en a
  // pas besoin (barres déjà larges), le quotidien (n≈30) s'écrase en
  // bouillie illisible sans ce filtre. Le caller n'a pas à le calculer.
  const minLabelSpacingPx = 40;
  const assumedWidthPx = 340; // approximation raisonnable, juste pour choisir combien de labels sauter
  const effectiveLabelEvery = labelEvery ?? Math.max(1, Math.ceil(minLabelSpacingPx / ((assumedWidthPx / n))));

  return (
    <div className="chart chart--bar" style={{ height }}>
      <div className="chart__yaxis" style={{ width: AXIS_W, top: TOP_PAD, bottom: X_AXIS_H }}>
        {yTicks.map((t) => (
          <span key={t} className="chart__tick" style={{ bottom: `${t * 100}%` }}>
            {Math.round(t * 100)}%
          </span>
        ))}
      </div>

      <div className="chart__plot" style={{ left: AXIS_W, top: TOP_PAD, bottom: X_AXIS_H }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Bar chart">
          {yTicks.map((t) => (
            <line key={t} x1="0" x2="100" y1={100 - t * 100} y2={100 - t * 100} className="chart__gridline" />
          ))}
          {values.map((v, i) => {
            if (v === null) return null;
            const x = i * (100 / n);
            const h = Math.max(v * 100, v > 0 ? 2 : 0);
            return (
              <rect
                key={i}
                x={x}
                y={100 - h}
                width={barWPct}
                height={h}
                className={i === highlightIndex ? "chart__bar chart__bar--highlight" : "chart__bar"}
              >
                <title>{`${labels[i]} — ${Math.round(v * 100)}%`}</title>
              </rect>
            );
          })}
        </svg>
      </div>

      <div className="chart__xaxis" style={{ left: AXIS_W, height: X_AXIS_H }}>
        {labels.map((label, i) =>
          i % effectiveLabelEvery === 0 ? (
            <span
              key={i}
              className="chart__label"
              // Ancré par le coin haut-droit (pas de translateX : l'origine
              // de la rotation est exactement le point positionné, sans
              // ambiguïté sur la composition des transforms) — le label
              // pend vers le bas-gauche depuis ce point, convention
              // classique des labels d'axe tournés.
              style={{ right: `${100 - (i + 0.5) * (100 / n)}%` }}
            >
              {label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
