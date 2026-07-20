import { computeBadges, type MonthStats } from "@/lib/stats";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";

/** V5 + V6 + V7 + V8 + V9 + B1/B5 (badges) : colonne droite. */
export function StatsPanel({ stats }: { stats: MonthStats }) {
  const badges = computeBadges(stats);

  return (
    <section className="statspanel">
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

      {badges.length > 0 && (
        <div className="panel">
          <h2 className="panel__title">Badges</h2>
          <ul className="badgelist">
            {badges.map((b) => (
              <li key={b.id} className="badgelist__item" title={b.description}>
                <span className="badgelist__emoji">{b.emoji}</span>
                {b.title}
              </li>
            ))}
          </ul>
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
