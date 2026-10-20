import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/user";
import { getReportData } from "@/lib/data";
import { computeReport } from "@/lib/report";
import { resolvePeriod, PERIOD_PRESETS } from "@/lib/period";
import { todayInTz } from "@/lib/dates";
import { APP_NAME } from "@/lib/config";
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
  const t = await getTranslations("Report");
  const tGrid = await getTranslations("Dashboard.grid");
  const locale = await getLocale();
  // Dimanche = 2023-01-01 : libellés de jour courts dans la langue de l'utilisateur.
  const wdLabel = (d: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2023, 0, 1 + d)));
  const today = todayInTz(user.timezone, user.dayStartHour);

  const { from, to, key, clamped } = resolvePeriod(
    { period: sp.period, from: sp.from, to: sp.to },
    today,
    user.plan,
  );

  const { habits, moods } = await getReportData(user.id, from, to);
  const r = computeReport({ habits, from, to, moods });

  const avgMoodLabel =
    r.avgMood !== null ? tGrid(`moodScale.${Math.min(5, Math.max(1, Math.round(r.avgMood))) as 1 | 2 | 3 | 4 | 5}`) : "—";

  const periodLabel = t(`periods.${key}`);
  const bestDay = [...r.byWeekday].sort((a, b) => b.pct - a.pct)[0];
  const worstDay = [...r.byWeekday].sort((a, b) => a.pct - b.pct)[0];

  // Étiquettes de l'axe : jour du mois, suffisant sur toutes les durées.
  const trendLabels = r.days.map((d) => d.date.slice(8));

  return (
    <div className="report">
      <div className="report__actions">
        <Link href="/app" className="report__back">
          ← {t("back")}
        </Link>
        <div className="report__actionsright">
          <PrintButton label={t("download")} />
        </div>
      </div>

      <form className="report__periods" method="get">
        <span className="report__periodslbl">{t("period")}</span>
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
              title={locked ? `${t(`periods.${p.key}`)} — ${t("proOnly")}` : t(`periods.${p.key}`)}
            >
              {t(`periods.${p.key}`)}
              {locked && " 🔒"}
            </button>
          );
        })}
        {user.plan === "PRO" && (
          <span className="report__custom">
            <input type="hidden" name="period" value="custom" />
            <input type="date" name="from" defaultValue={from} max={today} aria-label={t("from")} />
            <span>→</span>
            <input type="date" name="to" defaultValue={to} max={today} aria-label={t("to")} />
            <button type="submit" className="report__apply">
              {t("apply")}
            </button>
          </span>
        )}
      </form>

      {clamped && (
        <p className="report__notice">
          {t("clampedPrefix")} <Link href="/pricing">{t("goPro")}</Link> {t("clampedSuffix")}
        </p>
      )}

      <article className="report__sheet">
        <header className="report__head">
          <div>
            <h1 className="report__title">{t("title")}</h1>
            <p className="report__sub">
              {periodLabel} · {from} → {to} · {user.email}
            </p>
          </div>
          <div className="report__brand">
            <strong>{APP_NAME}</strong>
            <span>{t("generated", { date: today })}</span>
          </div>
        </header>

        <section className="report__kpis">
          <div className="report__kpi">
            <span className="report__kpival">{Math.round(r.overallPct * 100)}%</span>
            <span className="report__kpilbl">{t("completion")}</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">
              {r.totalDone}
              <small>/{r.totalGoal}</small>
            </span>
            <span className="report__kpilbl">{t("checks")}</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">{r.bestStreak}</span>
            <span className="report__kpilbl">{t("bestStreak")}</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">{r.perfectDays}</span>
            <span className="report__kpilbl">{t("perfectDays")}</span>
          </div>
          <div className="report__kpi">
            <span className="report__kpival">{r.avgMood !== null ? r.avgMood.toFixed(1) : "—"}</span>
            <span className="report__kpilbl">{t("avgMood")} · {avgMoodLabel}</span>
          </div>
        </section>

        <section>
          <h2 className="report__h2">{t("trend")}</h2>
          <div className="report__chart">
            <TrendChart values={r.days.map((d) => d.pct)} labels={trendLabels} />
          </div>
          <p className="report__caption">
            {t("trendCaption", { days: r.days.length, pct: Math.round(r.overallPct * 100) })}
          </p>
        </section>

        <section>
          <h2 className="report__h2">{t("byWeekday")}</h2>
          <div className="report__weekdays">
            {r.byWeekday.map((w) => (
              <div key={w.weekday} className="report__wd">
                <span className="report__wdbarwrap">
                  <span className="report__wdbar" style={{ height: `${Math.round(w.pct * 100)}%` }} />
                </span>
                <span className="report__wdpct">{Math.round(w.pct * 100)}%</span>
                <span className="report__wdlbl">{wdLabel(w.weekday)}</span>
              </div>
            ))}
          </div>
          {bestDay && worstDay && bestDay.weekday !== worstDay.weekday && (
            <p className="report__caption">
              {t.rich("weekdayCaption", {
                best: wdLabel(bestDay.weekday),
                bestPct: Math.round(bestDay.pct * 100),
                worst: wdLabel(worstDay.weekday),
                worstPct: Math.round(worstDay.pct * 100),
                b: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          )}
        </section>

        <section>
          <h2 className="report__h2">{t("byHabit")}</h2>
          <table className="report__table">
            <thead>
              <tr>
                <th>{t("cols.habit")}</th>
                <th>{t("cols.done")}</th>
                <th>{t("cols.days")}</th>
                <th>{t("cols.rate")}</th>
                <th>{t("cols.streak")}</th>
                <th>{t("cols.best")}</th>
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
                    {t("noHabits")}
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
            <h2 className="report__h2">{t("daily")}</h2>
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
          {APP_NAME} · {periodLabel} · {t("footer")}
        </footer>
      </article>
    </div>
  );
}
