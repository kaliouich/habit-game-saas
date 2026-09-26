import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { computeBadges, computeLifetimeProgress, pctTone, type MonthStats } from "@/lib/stats";
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
export async function StatsPanel({ stats, habits, plan }: StatsPanelProps) {
  const t = await getTranslations("Dashboard.stats");
  const tBadges = await getTranslations("Badges");
  const tRanks = await getTranslations("Ranks");
  const allBadges = computeBadges(stats, habits, tBadges);
  const unlocked = allBadges.filter((b) => plan === "PRO" || b.tier === "free");
  const lockedCount = allBadges.length - unlocked.length;
  const progress = computeLifetimeProgress(habits);
  const levelPct = Math.round((progress.xpIntoLevel / progress.xpForNextLevel) * 100);

  return (
    <section className="statspanel">
      <div className="herocard">
        <div className="herocard__head">
          <span className="herocard__rank">{tRanks(progress.rank.key)}</span>
          <span className="herocard__lvl">{t("level", { level: progress.level })}</span>
        </div>
        <div className="herocard__track">
          <span className="herocard__fill" style={{ width: `${levelPct}%` }} />
        </div>
        <div className="herocard__foot">
          <span>{t("xp", { current: progress.xpIntoLevel, next: progress.xpForNextLevel })}</span>
          <span>{progress.nextRank ? t("nextRank", { rank: tRanks(progress.nextRank.key) }) : t("maxRank")}</span>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">{t("weeklyProgress")}</h2>
        <BarChart
          values={stats.weeklyProgress.map((w) => w.pct)}
          labels={stats.weeklyProgress.map((w) => w.label.toLowerCase())}
          height={170}
        />
      </div>

      <div className="statcards">
        <div className="statcard">
          <span className="statcard__label">{t("goal")}</span>
          <span className="statcard__value">{stats.goalTotal}</span>
        </div>
        <div className="statcard">
          <span className="statcard__label">{t("completed")}</span>
          <span className="statcard__value">{stats.completedTotal}</span>
        </div>
        <div className="statcard">
          <span className="statcard__label">{t("left")}</span>
          <span className="statcard__value">{stats.leftTotal}</span>
        </div>
      </div>

      <div className="panel panel--donut">
        <h2 className="panel__title">{t("overallStats")}</h2>
        <DonutChart pct={stats.overallPct} />
      </div>

      {(unlocked.length > 0 || lockedCount > 0) && (
        <div className="panel">
          <h2 className="panel__title">{t("badges")}</h2>
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
              {t("moreBadgesWithPro", { count: lockedCount })}
            </Link>
          )}
        </div>
      )}

      <div className="panel">
        <h2 className="panel__title">{t("analysis")}</h2>
        <div className="analysiswrap">
        <table className="analysis">
          <thead>
            <tr>
              <th className="analysis__namehead">{t("habit")}</th>
              <th>{t("goal")}</th>
              <th>{t("actual")}</th>
              <th>{t("left")}</th>
              <th className="analysis__progresshead">{t("progress")}</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {stats.analysis.map((a) => (
              <tr key={a.habitId} title={`${a.name} ${a.emoji ?? ""}`}>
                <td className="analysis__name">
                  {a.emoji} {a.name}
                </td>
                <td>{a.goal}</td>
                <td>{a.actual}</td>
                <td>{a.left}</td>
                <td className="analysis__progress">
                  <span className="analysis__bar" data-tone={pctTone(a.pct)} style={{ width: `${Math.round(a.pct * 100)}%` }} />
                </td>
                <td>{Math.round(a.pct * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">{t("top10")}</h2>
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
