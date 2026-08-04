import type { MonthStats } from "@/lib/stats";
import type { ISODate } from "@/lib/dates";
import { DayCheckbox } from "./DayCheckbox";
import { MoodCell } from "./MoodCell";
import { ScrollToToday } from "./ScrollToToday";

interface GridHabit {
  id: string;
  name: string;
  emoji: string | null;
  loggedDates: Set<ISODate>;
}

interface MonthGridProps {
  stats: MonthStats;
  habits: GridHabit[];
  today: ISODate;
}

/** V3 + V10 : la grille du tableur — Week 1..N, We/Th/Fr + numéros, checkboxes, ligne mood. */
export function MonthGrid({ stats, habits, today }: MonthGridProps) {
  const { weeks, days, perfectDays } = stats;

  return (
    <div className="gridwrap">
      <ScrollToToday />
      <table className="grid">
        <thead>
          <tr className="grid__weeks">
            <th className="grid__corner" aria-label="Habit" />
            {weeks.map((w) => (
              <th key={w.label} colSpan={w.days.length} className="grid__week">
                {w.label}
              </th>
            ))}
          </tr>
          <tr className="grid__dows">
            <th />
            {days.map((d) => (
              <th key={d.date} className={d.date === today ? "grid__dow grid__dow--today" : "grid__dow"}>
                {d.dow}
              </th>
            ))}
          </tr>
          <tr className="grid__nums">
            <th />
            {days.map((d) => (
              <th
                key={d.date}
                data-today={d.date === today ? "1" : undefined}
                className={[
                  "grid__num",
                  d.date === today ? "grid__num--today" : "",
                  perfectDays.has(d.date) ? "grid__num--perfect" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {d.dayNum}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {habits.map((h) => (
            <tr key={h.id} className="grid__row">
              <th scope="row" className="grid__habit">
                {h.name} {h.emoji}
              </th>
              {days.map((d) => (
                <td key={d.date} className={d.date === today ? "grid__cell grid__cell--today" : "grid__cell"}>
                  <DayCheckbox habitId={h.id} date={d.date} checked={h.loggedDates.has(d.date)} disabled={d.date > today} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={days.length + 1} className="grid__wellness">
              Overall wellness
            </th>
          </tr>
          <tr>
            <th scope="row" className="grid__habit grid__habit--mood">
              Mood
            </th>
            {days.map((d) => (
              <td key={d.date} className="grid__cell grid__cell--mood">
                <MoodCell date={d.date} value={stats.moodByDate.get(d.date) ?? null} disabled={d.date > today} />
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
