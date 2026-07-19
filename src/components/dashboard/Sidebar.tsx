import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { addMonths, monthLabel, type MonthKey } from "@/lib/dates";
import type { MonthStats } from "@/lib/stats";
import { LineChart } from "@/components/charts/LineChart";
import { AddHabitForm } from "./AddHabitForm";
import { HabitMenu } from "./HabitMenu";

interface SidebarHabit {
  id: string;
  name: string;
  emoji: string | null;
  goal: number | null;
}

interface SidebarProps {
  month: MonthKey;
  habits: SidebarHabit[];
  stats: MonthStats;
  canAdd: boolean;
  limit: number;
}

/** V1 + V2 : colonne noire — titre, mois, My Habits, mood chart, logo. */
export function Sidebar({ month, habits, stats, canAdd, limit }: SidebarProps) {
  const moodValues = stats.days.map((d) => stats.moodByDate.get(d.date) ?? null);

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <h1 className="sidebar__title">HABIT TRACKER</h1>
        <nav className="monthpicker" aria-label="Month">
          <Link href={`/app?month=${addMonths(month, -1)}`} className="monthpicker__arrow" aria-label="Previous month">
            ‹
          </Link>
          <span className="monthpicker__label">{monthLabel(month)}</span>
          <Link href={`/app?month=${addMonths(month, 1)}`} className="monthpicker__arrow" aria-label="Next month">
            ›
          </Link>
        </nav>
      </div>

      <div className="sidebar__habits">
        <h2 className="sidebar__heading">My Habits</h2>
        <ul className="habitlist">
          {habits.map((h) => {
            const streak = stats.streaks.get(h.id);
            return (
              <li key={h.id} className="habitlist__row">
                <span className="habitlist__name">
                  {h.name} {h.emoji}
                </span>
                {streak && streak.current >= 2 && (
                  <span className="habitlist__streak" title={`${streak.current} jours de suite (record ${streak.best})`}>
                    {streak.current}🔥
                  </span>
                )}
                <HabitMenu habitId={h.id} name={h.name} emoji={h.emoji} goal={h.goal} />
              </li>
            );
          })}
        </ul>
        <AddHabitForm canAdd={canAdd} limit={limit} />
      </div>

      <div className="sidebar__bottom">
        <div className="sidebar__mood">
          <span className="sidebar__moodlabel">● Mood</span>
          <LineChart values={moodValues} />
        </div>
        <p className="sidebar__logo">
          {APP_NAME.split(" ").map((w) => (
            <span key={w}>{w.toUpperCase()}</span>
          ))}
        </p>
      </div>
    </aside>
  );
}
