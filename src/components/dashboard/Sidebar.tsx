import Link from "next/link";
import { APP_NAME, type BoardSkinKey } from "@/lib/config";
import { addMonths, monthLabel, type MonthKey, type ISODate } from "@/lib/dates";
import type { HabitUnit, MonthStats } from "@/lib/stats";
import { LineChart } from "@/components/charts/LineChart";
import { AddHabitForm } from "./AddHabitForm";
import { HabitMenu } from "./HabitMenu";
import { SignOutButton } from "./SignOutButton";
import { BoardSkinPicker } from "./BoardSkinPicker";
import { ShieldPanel } from "./ShieldPanel";

interface SidebarHabit {
  id: string;
  name: string;
  emoji: string | null;
  type: "BUILD" | "QUIT";
  goal: number | null;
  tags?: string[];
  unit?: HabitUnit;
  targetValue?: number | null;
  unitLabel?: string | null;
}

interface SidebarProps {
  month: MonthKey;
  habits: SidebarHabit[];
  stats: MonthStats;
  canAdd: boolean;
  limit: number;
  userEmail: string;
  plan: "FREE" | "PRO";
  boardSkin: BoardSkinKey;
  today: ISODate;
  shieldsUsed: number;
  missedDates: ISODate[];
}

/** V1 + V2 : colonne noire — titre, mois, My Habits, mood chart, logo. */
export function Sidebar({ month, habits, stats, canAdd, limit, userEmail, plan, boardSkin, today, shieldsUsed, missedDates }: SidebarProps) {
  const moodValues = stats.days.map((d) => stats.moodByDate.get(d.date) ?? null);

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <h1 className="sidebar__title">{APP_NAME.toUpperCase()}</h1>
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
                  {h.tags && h.tags.length > 0 && (
                    <span className="habitlist__tags">
                      {h.tags.map((t) => (
                        <span key={t} className="habitlist__tag">
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                {streak && streak.current >= 2 && (
                  <span className="habitlist__streak" title={`${streak.current} jours de suite (record ${streak.best})`}>
                    {streak.current}🔥
                  </span>
                )}
                <HabitMenu
                  habitId={h.id}
                  name={h.name}
                  emoji={h.emoji}
                  type={h.type}
                  goal={h.goal}
                  tags={h.tags ?? []}
                  plan={plan}
                  today={today}
                  unit={h.unit}
                  targetValue={h.targetValue}
                  unitLabel={h.unitLabel}
                />
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
        <ShieldPanel plan={plan} shieldsUsed={shieldsUsed} missedDates={missedDates} />
        <BoardSkinPicker current={boardSkin} plan={plan} />
        <p className="sidebar__logo">
          {APP_NAME.split(" ").map((w) => (
            <span key={w}>{w.toUpperCase()}</span>
          ))}
        </p>
        <div className="sidebar__account">
          <Link href="/app/journal" className="sidebar__report">
            📓 Journal
          </Link>
          <Link href={`/app/report?month=${month}`} className="sidebar__report">
            ⬇ Download progress report
          </Link>
          <span className="sidebar__email" title={userEmail}>
            {userEmail}
          </span>
          <Link href="/app/billing" className={plan === "FREE" ? "sidebar__plan sidebar__plan--free" : "sidebar__plan"}>
            {plan === "FREE" ? "Upgrade" : "Pro"}
          </Link>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
