import Link from "next/link";
import type { Metadata } from "next";
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

  if (user.plan !== "PRO") {
    return (
      <div className="journalpage">
        <Link href="/app" className="journalpage__back">
          ← Back to dashboard
        </Link>
        <div className="journalpage__locked">
          <h1>Journal</h1>
          <p>Rich journal entries linked to your habits — Pro feature.</p>
          <Link href="/pricing" className="journalpage__upsell">
            Unlock with Pro →
          </Link>
        </div>
      </div>
    );
  }

  const today = todayInTz(user.timezone);
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

  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: user.timezone });

  return (
    <div className="journalpage">
      <Link href="/app" className="journalpage__back">
        ← Back to dashboard
      </Link>

      <h1 className="journalpage__title">Journal</h1>

      <JournalForm today={today} habits={habits} />

      <form className="journalpage__filters" method="get">
        <select name="habitId" defaultValue={habitId ?? ""}>
          <option value="">All habits</option>
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.emoji} {h.name}
            </option>
          ))}
        </select>
        <input type="search" name="q" defaultValue={query ?? ""} placeholder="Search…" />
        <button type="submit">Filter</button>
        {(habitId || query) && <Link href="/app/journal">Clear</Link>}
      </form>

      <div className="journalpage__list">
        {entries.length === 0 && <p className="journalpage__empty">No entries yet.</p>}
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
