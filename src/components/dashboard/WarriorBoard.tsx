import type { MonthStats } from "@/lib/stats";
import type { ISODate } from "@/lib/dates";
import { DayCheckbox } from "./DayCheckbox";
import { TodayToggle } from "./TodayToggle";
import { MoodCell } from "./MoodCell";

interface BoardHabit {
  id: string;
  name: string;
  emoji: string | null;
  loggedDates: Set<ISODate>;
  pausedDates?: Set<ISODate>;
}

interface WarriorBoardProps {
  stats: MonthStats;
  habits: BoardHabit[];
  today: ISODate;
}

/** Circonférence d'un cercle r=15 — sert au stroke-dasharray de l'anneau. */
const RING_C = 2 * Math.PI * 15;

/**
 * Le board (Sprint 7) — remplace la grille tableur. Une carte par habitude :
 * la coche du jour est la cible principale (gros bouton), le mois reste
 * consultable sous forme de piste compacte. La grille d'origine est archivée
 * dans legacy/original-spreadsheet-grid/.
 */
export function WarriorBoard({ stats, habits, today }: WarriorBoardProps) {
  const { days, perfectDays } = stats;

  return (
    <section className="board">
      {habits.map((h) => {
        const streak = stats.streaks.get(h.id);
        const analysis = stats.analysis.find((a) => a.habitId === h.id);
        const pct = analysis ? Math.round(analysis.pct * 100) : 0;
        const doneToday = h.loggedDates.has(today);

        return (
          <article key={h.id} className={doneToday ? "hcard is-done" : "hcard"}>
            <div className="hcard__top">
              <TodayToggle habitId={h.id} date={today} checked={doneToday} name={h.name} />

              <div className="hcard__id">
                <h3 className="hcard__name">
                  {h.name} {h.emoji}
                </h3>
                <p className="hcard__meta">
                  {streak && streak.current > 0 ? (
                    <span className="hcard__streak">🔥 {streak.current}-day streak</span>
                  ) : (
                    <span className="hcard__streak hcard__streak--none">No streak yet</span>
                  )}
                  {analysis && (
                    <span className="hcard__count">
                      {analysis.actual}/{analysis.goal} this month
                    </span>
                  )}
                </p>
              </div>

              <div className="hcard__ring" aria-hidden>
                <svg viewBox="0 0 36 36">
                  <circle className="hcard__ringtrack" cx="18" cy="18" r="15" />
                  <circle
                    className="hcard__ringfill"
                    cx="18"
                    cy="18"
                    r="15"
                    strokeDasharray={`${(RING_C * pct) / 100} ${RING_C}`}
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <span className="hcard__ringpct">{pct}%</span>
              </div>
            </div>

            {/* Piste du mois : consultable et cliquable, mais visuellement
                secondaire — la décision quotidienne est le bouton ci-dessus. */}
            <div className="hcard__trail" role="group" aria-label={`${h.name} — this month`}>
              {days.map((d) => (
                <DayCheckbox
                  key={d.date}
                  habitId={h.id}
                  date={d.date}
                  checked={h.loggedDates.has(d.date)}
                  disabled={d.date > today}
                  variant="trail"
                  dayNum={d.dayNum}
                  isToday={d.date === today}
                  isPaused={h.pausedDates?.has(d.date) ?? false}
                />
              ))}
            </div>
          </article>
        );
      })}

      <article className="hcard hcard--mood">
        <div className="hcard__top">
          <div className="hcard__id">
            <h3 className="hcard__name">How did the day feel?</h3>
            <p className="hcard__meta">
              <span className="hcard__streak hcard__streak--none">
                {perfectDays.size} perfect {perfectDays.size === 1 ? "day" : "days"} this month
              </span>
            </p>
          </div>
        </div>
        <div className="hcard__trail hcard__trail--mood">
          {days.map((d) => (
            <MoodCell
              key={d.date}
              date={d.date}
              value={stats.moodByDate.get(d.date) ?? null}
              disabled={d.date > today}
            />
          ))}
        </div>
      </article>
    </section>
  );
}
