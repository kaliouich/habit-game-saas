import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/user";
import { getDashboardData } from "@/lib/data";
import { canViewMonth } from "@/lib/quotas";
import { currentMonth, isValidMonthKey, monthLabel, addMonths } from "@/lib/dates";
import { APP_NAME, MOODS } from "@/lib/config";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Progress report — ${APP_NAME}`,
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function ReportPage({ searchParams }: Props) {
  const { month: rawMonth } = await searchParams;
  const user = await getCurrentUser();
  const current = currentMonth(user.timezone);
  const month = isValidMonthKey(rawMonth ?? "") ? (rawMonth as string) : current;

  // Même règle que le dashboard : Free = mois courant seulement.
  if (!canViewMonth(user.plan, month, current)) {
    redirect(`/app/report?month=${current}`);
  }

  const weekStartsOn = user.weekStartsOn === 0 ? 0 : 1;
  const { stats, habits } = await getDashboardData(user.id, month, user.timezone, weekStartsOn);

  const moodValues = [...stats.moodByDate.values()];
  const avgMood =
    moodValues.length > 0
      ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length
      : null;
  const avgMoodLabel =
    avgMood !== null ? MOODS.find((m) => m.value === Math.round(avgMood))?.label ?? "—" : "—";

  const bestStreakOverall = Math.max(
    0,
    ...[...stats.streaks.values()].map((s) => s.best),
  );

  const generated = new Date().toISOString().slice(0, 10);

  return (
    <div className="report">
      <div className="report__actions">
        <Link href="/app" className="report__back">
          ← Back to dashboard
        </Link>
        <div className="report__actionsright">
          {user.plan === "PRO" && (
            <Link href={`/app/report?month=${addMonths(month, -1)}`} className="report__navlink">
              ‹ Previous month
            </Link>
          )}
          <PrintButton />
        </div>
      </div>

      <article className="report__sheet">
        <header className="report__head">
          <div>
            <h1 className="report__title">Progress report</h1>
            <p className="report__sub">
              {monthLabel(month)} · {user.email}
            </p>
          </div>
          <div className="report__brand">
            <strong>{APP_NAME}</strong>
            <span>Generated {generated}</span>
          </div>
        </header>

        <section className="report__kpis">
          <div className="report__kpi">
            <span className="report__kpival">{Math.round(stats.overallPct * 100)}%</span>
            <span className="report__kpilbl">Completion</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">
              {stats.completedTotal}
              <small>/{stats.goalTotal}</small>
            </span>
            <span className="report__kpilbl">Checks</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">{bestStreakOverall}</span>
            <span className="report__kpilbl">Best streak</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">{stats.perfectDays.size}</span>
            <span className="report__kpilbl">Perfect days</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">
              {avgMood !== null ? avgMood.toFixed(1) : "—"}
            </span>
            <span className="report__kpilbl">Avg mood · {avgMoodLabel}</span>
          </div>
        </section>

        <section>
          <h2 className="report__h2">By habit</h2>
          <table className="report__table">
            <thead>
              <tr>
                <th>Habit</th>
                <th>Done</th>
                <th>Goal</th>
                <th>Rate</th>
                <th>Streak</th>
                <th>Best</th>
              </tr>
            </thead>
            <tbody>
              {stats.analysis.map((a) => {
                const s = stats.streaks.get(a.habitId);
                return (
                  <tr key={a.habitId}>
                    <td className="report__habit">
                      {a.name} {a.emoji}
                    </td>
                    <td>{a.actual}</td>
                    <td>{a.goal}</td>
                    <td>
                      <span className="report__bar">
                        <span style={{ width: `${Math.round(a.pct * 100)}%` }} />
                      </span>
                      {Math.round(a.pct * 100)}%
                    </td>
                    <td>{s?.current ?? 0}</td>
                    <td>{s?.best ?? 0}</td>
                  </tr>
                );
              })}
              {stats.analysis.length === 0 && (
                <tr>
                  <td colSpan={6} className="report__empty">
                    No habits tracked this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="report__h2">Daily record</h2>
          <div className="report__gridwrap">
            <table className="report__grid">
              <thead>
                <tr>
                  <th />
                  {stats.days.map((d) => (
                    <th key={d.date}>{d.dayNum}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map((h) => (
                  <tr key={h.id}>
                    <th scope="row">{h.name}</th>
                    {stats.days.map((d) => (
                      <td
                        key={d.date}
                        className={h.loggedDates.has(d.date) ? "is-on" : undefined}
                      >
                        {h.loggedDates.has(d.date) ? "●" : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="report__foot">
          {APP_NAME} · {monthLabel(month)} · This report reflects data at time of generation.
        </footer>
      </article>
    </div>
  );
}
