import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { APP_NAME, type BoardSkinKey } from "@/lib/config";
import { addMonths, monthLabel, type MonthKey, type ISODate } from "@/lib/dates";
import type { HabitUnit, MonthStats } from "@/lib/stats";
import { LineChart } from "@/components/charts/LineChart";
import { AddHabitForm } from "./AddHabitForm";
import { HabitMenu } from "./HabitMenu";
import { SignOutButton } from "./SignOutButton";
import { BoardSkinPicker } from "./BoardSkinPicker";
import { ShieldPanel } from "./ShieldPanel";
import { ReminderSettings } from "./ReminderSettings";
import { CopyReferralLink } from "@/components/CopyReferralLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
  referralCode: string;
}

/** V1 + V2 : colonne noire — titre, mois, My Habits, mood chart, logo. */
export async function Sidebar({ month, habits, stats, canAdd, limit, userEmail, plan, boardSkin, today, shieldsUsed, missedDates, referralCode }: SidebarProps) {
  const moodValues = stats.days.map((d) => stats.moodByDate.get(d.date) ?? null);
  const motivationValues = stats.days.map((d) => stats.motivationByDate.get(d.date) ?? null);
  const t = await getTranslations("Dashboard.sidebar");
  const locale = await getLocale();

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <div className="sidebar__titlerow">
          <h1 className="sidebar__title">{APP_NAME.toUpperCase()}</h1>
          <LanguageSwitcher className="langswitcher langswitcher--sidebar" />
        </div>
        <nav className="monthpicker" aria-label={t("month")}>
          <Link href={`/app?month=${addMonths(month, -1)}`} className="monthpicker__arrow" aria-label={t("previousMonth")}>
            ‹
          </Link>
          <span className="monthpicker__label">{monthLabel(month, locale)}</span>
          <Link href={`/app?month=${addMonths(month, 1)}`} className="monthpicker__arrow" aria-label={t("nextMonth")}>
            ›
          </Link>
        </nav>
      </div>

      <div className="sidebar__habits">
        <h2 className="sidebar__heading">{t("myHabits")}</h2>
        <ul className="habitlist">
          {habits.map((h) => {
            const streak = stats.streaks.get(h.id);
            return (
              <li key={h.id} className="habitlist__row">
                <span className="habitlist__name">
                  {h.name} {h.emoji}
                  {h.tags && h.tags.length > 0 && (
                    <span className="habitlist__tags">
                      {h.tags.map((tag) => (
                        <span key={tag} className="habitlist__tag">
                          {tag}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                {streak && streak.current >= 2 && (
                  <span className="habitlist__streak" title={t("streakTitle", { current: streak.current, best: streak.best })}>
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
          <div className="sidebar__moodlegend">
            <span className="sidebar__moodlabel sidebar__moodlabel--mood">● {t("mood")}</span>
            <span className="sidebar__moodlabel sidebar__moodlabel--motivation">● {t("motivation")}</span>
          </div>
          <LineChart
            series={[
              { values: moodValues, color: "var(--check)" },
              { values: motivationValues, color: "var(--accent)" },
            ]}
          />
        </div>
        <ShieldPanel plan={plan} shieldsUsed={shieldsUsed} missedDates={missedDates} />
        <ReminderSettings />
        {/* Le programme de parrainage existait déjà (page billing), mais
            personne ne le voyait jamais — enterré 4 écrans plus bas. Ici, à
            côté des séries, c'est le moment où l'utilisateur est le plus
            susceptible d'avoir envie d'en parler à quelqu'un. */}
        <div className="referralnudge">
          <p className="referralnudge__text">🎁 {t("referral")}</p>
          <CopyReferralLink link={`${APP_URL}/login?ref=${referralCode}`} />
        </div>
        <BoardSkinPicker current={boardSkin} plan={plan} />
        <p className="sidebar__logo">
          {APP_NAME.split(" ").map((w) => (
            <span key={w}>{w.toUpperCase()}</span>
          ))}
        </p>
        <div className="sidebar__account">
          <Link href="/app/journal" className="sidebar__report">
            📓 {t("journal")}
          </Link>
          <Link href={`/app/report?month=${month}`} className="sidebar__report">
            ⬇ {t("downloadReport")}
          </Link>
          <span className="sidebar__email" title={userEmail}>
            {userEmail}
          </span>
          <Link href="/app/billing" className={plan === "FREE" ? "sidebar__plan sidebar__plan--free" : "sidebar__plan"}>
            {plan === "FREE" ? t("upgrade") : t("pro")}
          </Link>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
