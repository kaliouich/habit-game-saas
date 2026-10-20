import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { expandDateRange, todayInTz } from "@/lib/dates";
import { deriveLoggedDates } from "@/lib/stats";
import { computeHabitInsights } from "@/lib/insights";
import { APP_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Insights — ${APP_NAME}`,
  robots: { index: false },
};

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export default async function HabitInsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const t = await getTranslations("Insights");
  const locale = await getLocale();

  const [habit, shields] = await Promise.all([
    prisma.habit.findFirst({
      where: { id, userId: user.id, type: "BUILD" },
      include: {
        logs: { select: { date: true, value: true } },
        pauses: { select: { from: true, to: true } },
      },
    }),
    prisma.streakShield.findMany({ where: { userId: user.id }, select: { date: true } }),
  ]);
  if (!habit) notFound();

  const today = todayInTz(user.timezone, user.dayStartHour);
  const createdOn = new Intl.DateTimeFormat("en-CA", { timeZone: user.timezone }).format(habit.createdAt);
  const insights = computeHabitInsights({
    logged: deriveLoggedDates(habit.logs, habit.targetValue),
    paused: new Set([...habit.pauses.flatMap((p) => expandDateRange(p.from, p.to)), ...shields.map((s) => s.date)]),
    scheduleDays: habit.scheduleDays,
    createdOn,
    today,
  });

  // Libellés de jours via Intl (dimanche = 2023-01-01) : suit la langue sans table à maintenir.
  const dayName = (d: number, style: "narrow" | "long") =>
    new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(new Date(Date.UTC(2023, 0, 1 + d)));
  const order = user.weekStartsOn === 0 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });

  // Meilleur / pire jour parmi ceux qui ont de la donnée.
  const known = insights.weekdayRates.map((r, d) => ({ r, d })).filter((x): x is { r: number; d: number } => x.r !== null);
  const best = known.length > 1 ? [...known].sort((a, b) => b.r - a.r)[0] : null;
  const worst = known.length > 1 ? [...known].sort((a, b) => a.r - b.r)[0] : null;

  return (
    <div className="insightspage">
      <Link href="/app" className="journalpage__back">
        ← {t("back")}
      </Link>
      <h1 className="journalpage__title">
        {habit.emoji} {habit.name}
      </h1>

      <div className="insights__stats">
        <div className="insights__stat">
          <span className="insights__value">{pct(insights.strength)}</span>
          <span className="insights__label">{t("strength")}</span>
          <span className="insights__bar">
            <span style={{ width: `${Math.round(insights.strength * 100)}%` }} />
          </span>
        </div>
        <div className="insights__stat">
          <span className="insights__value">{insights.currentStreak} 🔥</span>
          <span className="insights__label">{t("currentStreak")}</span>
        </div>
        <div className="insights__stat">
          <span className="insights__value">{insights.bestStreak}</span>
          <span className="insights__label">{t("bestStreak")}</span>
        </div>
        <div className="insights__stat">
          <span className="insights__value">{insights.totalDone}</span>
          <span className="insights__label">{t("totalDone")}</span>
        </div>
        <div className="insights__stat">
          <span className="insights__value">{pct(insights.rate30)}</span>
          <span className="insights__label">{t("rate30")}</span>
        </div>
        <div className="insights__stat">
          <span className="insights__value">{pct(insights.rate90)}</span>
          <span className="insights__label">{t("rate90")}</span>
        </div>
      </div>

      <h2 className="insights__heading">{t("lastYear")}</h2>
      {/* dir=rtl sur le conteneur : le défilement démarre à droite, sur les semaines récentes. */}
      <div className="insights__heatscroll" dir="rtl">
        <div className="insights__heat" dir="ltr" role="img" aria-label={t("lastYear")}>
          {insights.heatmap.map((col, w) => {
            const first = col[0].date;
            const monthOf = (i: number) => insights.heatmap[i]?.[0].date.slice(5, 7);
            // Pas de libellé en première colonne si le mois suivant démarre juste après (collision).
            const showMonth = w === 0 ? monthOf(1) === monthOf(0) : monthOf(w) !== monthOf(w - 1);
            return (
              <div key={first} className="insights__col">
                <span className="insights__month">{showMonth ? monthFmt.format(new Date(`${first}T00:00:00Z`)) : ""}</span>
                {col.map((c) => (
                  <span key={c.date} className={`insights__cell insights__cell--${c.state}`} title={c.date} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="insights__legend">
        <span><i className="insights__cell insights__cell--done" /> {t("legendDone")}</span>
        <span><i className="insights__cell insights__cell--missed" /> {t("legendMissed")}</span>
        <span><i className="insights__cell insights__cell--off" /> {t("legendOff")}</span>
      </div>

      <h2 className="insights__heading">{t("byWeekday")}</h2>
      <div className="insights__weekdays">
        {order.map((d) => {
          const r = insights.weekdayRates[d];
          return (
            <div key={d} className="insights__weekday" title={`${dayName(d, "long")} ${pct(r)}`}>
              <span className="insights__weekdaybar">
                <span style={{ height: `${Math.round((r ?? 0) * 100)}%` }} />
              </span>
              <span className="insights__weekdaypct">{pct(r)}</span>
              <span className="insights__weekdayname">{dayName(d, "narrow")}</span>
            </div>
          );
        })}
      </div>
      {best && worst && best.d !== worst.d && best.r !== worst.r && (
        <p className="insights__tip">{t("tip", { best: dayName(best.d, "long"), worst: dayName(worst.d, "long") })}</p>
      )}
    </div>
  );
}
