const ROWS: { name: string; emoji: string; done: boolean[] }[] = [
  { name: "Wake up at 05:00", emoji: "⏰", done: [true, true, true, false, true, true, true] },
  { name: "Gym", emoji: "💪", done: [true, false, true, true, true, false, true] },
  { name: "Reading / Learning", emoji: "📖", done: [true, true, false, true, true, true, false] },
  { name: "Project Work", emoji: "🎯", done: [true, true, true, true, false, true, true] },
  { name: "No Alcohol", emoji: "🍾", done: [true, true, true, true, true, true, false] },
];

const DAYS = ["We", "Th", "Fr", "Sa", "Su", "Mo", "Tu"];

/** Aperçu statique décoratif de la grille — pas de data réelle, page publique. */
export function HeroPreview() {
  return (
    <div className="heropreview" aria-hidden="true">
      <table className="heropreview__table">
        <thead>
          <tr>
            <th />
            {DAYS.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.name}>
              <th scope="row">
                {row.name} {row.emoji}
              </th>
              {row.done.map((done, i) => (
                <td key={i}>
                  <span className={done ? "heropreview__cell heropreview__cell--on" : "heropreview__cell"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
