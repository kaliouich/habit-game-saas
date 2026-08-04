import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/user";
import { getReportData } from "@/lib/data";
import { computeReport } from "@/lib/report";
import { resolvePeriod, PERIOD_PRESETS, type PeriodKey } from "@/lib/period";
import { todayInTz } from "@/lib/dates";
import { APP_NAME, MOODS } from "@/lib/config";
import { PrintButton } from "@/components/PrintButton";
import { TrendChart } from "@/components/charts/TrendChart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Progress report — ${APP_NAME}`,
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}

export default async function ReportPage({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const today = todayInTz(user.timezone);

  const { from, to, key, label, clamped } = resolvePeriod(
    { period: sp.period, from: sp.from, to: sp.to },
    today,
    user.plan,
  );

  const { habits, moods } = await getReportData(user.id, from, to);
  const r = computeReport({ habits, from, to, moods });

  const avgMoodLabel =
    r.avgMood !== null ? MOODS.find((m) => m.value === Math.round(r.avgMood!))?.label ?? "—" : "—";

  const bestDay = [...r.byWeekday].sort((a, b) => b.pct - a.pct)[0];
  const worstDay = [...r.byWeekday].sort((a, b) => a.pct - b.pct)[0];

  // Étiquettes de l'axe : jour du mois, suffisant sur toutes les durées.
  const trendLabels = r.days.map((d) => d.date.slice(8));

  return (
    <div className="report">
      <div className="report__actions">
        <Link href="/app" className="report__back">
          ← Back to dashboard
        </Link>
        <div className="report__actionsright">
          <PrintButton />
        </div>
      </div>

      <form className="report__periods" method="get">
        <span className="report__periodslbl">Period</span>
        {PERIOD_PRESETS.map((p) => {
          const locked = p.proOnly && user.plan !== "PRO";
          return (
            <button
              key={p.key}
              type="submit"
              name="period"
              value={p.key}
              disabled={locked}
              className={`report__period${key === p.key ? " is-active" : ""}${locked ? " is-locked" : ""}`}
              title={locked ? `${p.label} — Pro only` : p.label}
            >
              {p.label}
              {locked && " 🔒"}
            </button>
          );
        })}
        {user.plan === "PRO" && (
          <span className="report__custom">
            <input type="hidden" name="period" value="custom" />
            <input type="date" name="from" defaultValue={from} max={today} aria-label="From" />
            <span>→</span>
            <input type="date" name="to" defaultValue={to} max={today} aria-label="To" />
            <button type="submit" className="report__apply">
              Apply
            </button>
          </span>
        )}
      </form>

      {clamped && (
        <p className="report__notice">
          Free plan covers the current month. <Link href="/pricing">Go Pro</Link> for longer
          periods and custom ranges.
        </p>
      )}

      <article className="report__sheet">
        <header className="report__head">
          <div>
            <h1 className="report__title">Progress report</h1>
            <p className="report__sub">
              {label} · {from} → {to} · {user.email}
            </p>
          </div>
          <div className="report__brand">
            <strong>{APP_NAME}</strong>
            <span>Generated {today}</span>
          </div>
        </header>

        <section className="report__kpis">
          <div className="report__kpi">
            <span className="report__kpival">{Math.round(r.overallPct * 100)}%</span>
            <span className="report__kpilbl">Completion</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">
              {r.totalDone}
              <small>/{r.totalGoal}</small>
            </span>
            <span className="report__kpilbl">Checks</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">{r.bestStreak}</span>
            <span className="report__kpilbl">Best streak</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">{r.perfectDays}</span>
            <span className="report__kpilbl">Perfect days</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">{r.avgMood !== null ? r.avgMood.toFixed(1) : "—"}</span>
            <span className="report__kpilbl">Avg mood · {avgMoodLabel}</span>
          </div>
        </section>

        <section>
          <h2 className="report__h2">Completion trend</h2>
          <div className="report__chart">
            <TrendChart values={r.days.map((d) => d.pct)} labels={trendLabels} />
          </div>
          <p className="report__caption">
            Daily completion across {r.days.length} days. The dashed line is the period average
            ({Math.round(r.overallPct * 100)}%).
          </p>
        </section>

        <section>
          <h2 className="report__h2">By day of week</h2>
          <div className="report__weekdays">
            {r.byWeekday.map((w) => (
              <div key={w.weekday} className="report__wd">
                <span className="report__wdbarwrap">
                  <span className="report__wdbar" style={{ height: `${Math.round(w.pct * 100)}%` }} />
                </span>
                <span className="report__wdpct">{Math.round(w.pct * 100)}%</span>
                <span className="report__wdlbl">{w.label}</span>
              </div>
            ))}
          </div>
          {bestDay && worstDay && bestDay.weekday !== worstDay.weekday && (
            <p className="report__caption">
              Strongest on <strong>{bestDay.label}</strong> ({Math.round(bestDay.pct * 100)}%),
              weakest on <strong>{worstDay.label}</strong> ({Math.round(worstDay.pct * 100)}%).
            </p>
          )}
        </section>

        <section>
          <h2 className="report__h2">By habit</h2>
          <table className="report__table">
            <thead>
              <tr>
                <th>Habit</th>
                <th>Done</th>
                <th>Days</th>
                <th>Rate</th>
                <th>Streak</th>
                <th>Best</th>
              </tr>
            </thead>
            <tbody>
              {r.byHabit.map((h) => (
                <tr key={h.habitId}>
                  <td className="report__habit">
                    {h.name} {h.emoji}
                  </td>
                  <td>{h.done}</td>
                  <td>{h.goal}</td>
                  <td>
                    <span className="report__bar">
                      <span style={{ width: `${Math.round(h.pct * 100)}%` }} />
                    </span>
                    {Math.round(h.pct * 100)}%
                  </td>
                  <td>{h.currentStreak}</td>
                  <td>{h.bestStreak}</td>
                </tr>
              ))}
              {r.byHabit.length === 0 && (
                <tr>
                  <td colSpan={6} className="report__empty">
                    No habits tracked in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Le journal jour par jour n'est lisible que sur des périodes courtes ;
            au-delà, la tendance ci-dessus dit la même chose en mieux. */}
        {r.days.length <= 62 && (
          <section>
            <h2 className="report__h2">Daily record</h2>
            <div className="report__gridwrap">
              <table className="report__grid">
                <thead>
                  <tr>
                    <th />
                    {r.days.map((d) => (
                      <th key={d.date}>{d.date.slice(8)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {habits.map((h) => (
                    <tr key={h.id}>
                      <th scope="row">{h.name}</th>
                      {r.days.map((d) => (
                        <td key={d.date} className={h.loggedDates.has(d.date) ? "is-on" : undefined}>
                          {h.loggedDates.has(d.date) ? "●" : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer className="report__foot">
          {APP_NAME} · {label} · This report reflects data at time of generation.
        </footer>
      </article>
    </div>
  );
}
