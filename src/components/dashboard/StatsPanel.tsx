import Link from "next/link";
import { computeBadges, computeLifetimeProgress, type MonthStats } from "@/lib/stats";
import type { ISODate } from "@/lib/dates";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";

interface StatsPanelHabit {
  loggedDates: Set<ISODate>;
}

interface StatsPanelProps {
  stats: MonthStats;
  habits: StatsPanelHabit[];
  plan: "FREE" | "PRO";
}

/** V5 + V6 + V7 + V8 + V9 + B1/B5 (badges) + XP/levels (Sprint 6) : colonne droite. */
export function StatsPanel({ stats, habits, plan }: StatsPanelProps) {
  const allBadges = computeBadges(stats, habits);
  const unlocked = allBadges.filter((b) => plan === "PRO" || b.tier === "free");
  const lockedCount = allBadges.length - unlocked.length;
  const progress = computeLifetimeProgress(habits);
  const levelPct = Math.round((progress.xpIntoLevel / progress.xpForNextLevel) * 100);

  return (
    <section className="statspanel">
      <div className="herocard">
        <div className="herocard__crest" aria-hidden>
          <span className="herocard__emblem">{progress.rank.emblem}</span>
          <span className="herocard__lvl">{progress.level}</span>
        </div>
        <div className="herocard__body">
          <p className="herocard__rank">{progress.rank.label}</p>
          <p className="herocard__sub">
            Level {progress.level}
            {progress.nextRank
              ? ` · ${progress.nextRank.label} at ${progress.nextRank.minLevel}`
              : " · max rank"}
          </p>
          <div className="herocard__track">
            <span className="herocard__fill" style={{ width: `${levelPct}%` }} />
          </div>
          <p className="herocard__xp">
            {progress.xpIntoLevel} / {progress.xpForNextLevel} XP
          </p>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">Weekly Progress</h2>
        <BarChart
          values={stats.weeklyProgress.map((w) => w.pct)}
          labels={stats.weeklyProgress.map((w) => w.label.toLowerCase())}
          height={90}
        />
      </div>

      <div className="statcards">
        <div className="statcard">
          <span className="statcard__label">Goal</span>
          <span className="statcard__value">{stats.goalTotal}</span>
        </div>
        <div className="statcard">
          <span className="statcard__label">Completed</span>
          <span className="statcard__value">{stats.completedTotal}</span>
        </div>
        <div className="statcard">
          <span className="statcard__label">Left</span>
          <span className="statcard__value">{stats.leftTotal}</span>
        </div>
      </div>

      <div className="panel panel--donut">
        <h2 className="panel__title">Overall Stats</h2>
        <DonutChart pct={stats.overallPct} />
      </div>

      {(unlocked.length > 0 || lockedCount > 0) && (
        <div className="panel">
          <h2 className="panel__title">Badges</h2>
          <ul className="badgelist">
            {unlocked.map((b) => (
              <li key={b.id} className="badgelist__item" title={b.description}>
                <span className="badgelist__emoji">{b.emoji}</span>
                {b.title}
              </li>
            ))}
          </ul>
          {lockedCount > 0 && (
            <Link href="/pricing" className="badgelist__upsell">
              🔒 +{lockedCount} more badge{lockedCount > 1 ? "s" : ""} with Pro
            </Link>
          )}
        </div>
      )}

      <div className="panel">
        <h2 className="panel__title">Analysis</h2>
        <table className="analysis">
          <thead>
            <tr>
              <th>Goal</th>
              <th>Actual</th>
              <th>Left</th>
              <th className="analysis__progresshead">Progress</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {stats.analysis.map((a) => (
              <tr key={a.habitId} title={`${a.name} ${a.emoji ?? ""}`}>
                <td>{a.goal}</td>
                <td>{a.actual}</td>
                <td>{a.left}</td>
                <td className="analysis__progress">
                  <span className="analysis__bar" style={{ width: `${Math.round(a.pct * 100)}%` }} />
                </td>
                <td>{Math.round(a.pct * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2 className="panel__title">Top 10 Habits</h2>
        <ol className="tophabits">
          {stats.top10.map((a, i) => (
            <li key={a.habitId} className="tophabits__row">
              <span className="tophabits__rank">{i + 1}</span>
              <span className="tophabits__name">
                {a.name} {a.emoji}
              </span>
              <span className="tophabits__pct">{Math.round(a.pct * 100)}%</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
