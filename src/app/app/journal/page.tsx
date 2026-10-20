import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/user";
import { getJournalEntries } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { blocksToMarkdown } from "@/lib/journal";
import { todayInTz } from "@/lib/dates";
import { APP_NAME } from "@/lib/config";
import { JournalForm } from "@/components/dashboard/JournalForm";
import { JournalEntryCard } from "@/components/dashboard/JournalEntryCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Journal — ${APP_NAME}`,
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ habitId?: string; q?: string }>;
}

export default async function JournalPage({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const t = await getTranslations("Journal");
  const locale = await getLocale();

  if (user.plan !== "PRO") {
    return (
      <div className="journalpage">
        <Link href="/app" className="journalpage__back">
          ← {t("back")}
        </Link>
        <div className="journalpage__locked">
          <h1>{t("title")}</h1>
          <p>{t("lockedText")}</p>
          <Link href="/pricing" className="journalpage__upsell">
            {t("unlock")}
          </Link>
        </div>
      </div>
    );
  }

  const today = todayInTz(user.timezone, user.dayStartHour);
  const habitId = sp.habitId || undefined;
  const query = sp.q || undefined;

  const [habits, entries] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: user.id, archivedAt: null },
      select: { id: true, name: true, emoji: true },
      orderBy: { position: "asc" },
    }),
    getJournalEntries(user.id, { habitId, query }),
  ]);

  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: user.timezone });

  return (
    <div className="journalpage">
      <Link href="/app" className="journalpage__back">
        ← {t("back")}
      </Link>

      <h1 className="journalpage__title">{t("title")}</h1>

      <JournalForm today={today} habits={habits} />

      <form className="journalpage__filters" method="get">
        <select name="habitId" defaultValue={habitId ?? ""}>
          <option value="">{t("allHabits")}</option>
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.emoji} {h.name}
            </option>
          ))}
        </select>
        <input type="search" name="q" defaultValue={query ?? ""} placeholder={t("search")} />
        <button type="submit">{t("filter")}</button>
        {(habitId || query) && <Link href="/app/journal">{t("clear")}</Link>}
      </form>

      <div className="journalpage__list">
        {entries.length === 0 && <p className="journalpage__empty">{t("empty")}</p>}
        {entries.map((e) => (
          <JournalEntryCard
            key={e.id}
            id={e.id}
            date={e.date}
            timeLabel={timeFormatter.format(e.createdAt)}
            title={e.title}
            content={e.content}
            markdown={blocksToMarkdown(e.content)}
            habitName={e.habitName}
            habitEmoji={e.habitEmoji}
          />
        ))}
      </div>
    </div>
  );
}
