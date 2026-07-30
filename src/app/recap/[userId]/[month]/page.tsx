import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isValidMonthKey, daysInMonth, pad2, monthLabel } from "@/lib/dates";
import { computeMonthStats } from "@/lib/stats";
import { APP_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ userId: string; month: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;
  return {
    title: `Monthly recap · ${monthLabel(isValidMonthKey(month) ? month : "2020-01")} · ${APP_NAME}`,
    robots: { index: false },
  };
}

export default async function RecapPage({ params }: Props) {
  const { userId, month } = await params;

  if (!isValidMonthKey(month)) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, plan: true, timezone: true, weekStartsOn: true },
  });
  if (!user || user.plan !== "PRO") notFound();

  const monthEnd = `${month}-${pad2(daysInMonth(month))}`;

  const [habitRows, moods] = await Promise.all([
    prisma.habit.findMany({
      where: {
        userId,
        OR: [{ archivedAt: null }, { archivedAt: { gt: new Date(`${monthEnd}T23:59:59Z`) } }],
      },
      include: { logs: { where: { date: { gte: `${month}-01`, lte: monthEnd } }, select: { date: true } } },
      orderBy: { position: "asc" },
    }),
    prisma.moodLog.findMany({
      where: { userId, date: { gte: `${month}-01`, lte: monthEnd } },
      select: { date: true, value: true },
    }),
  ]);

  const habits = habitRows.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    type: h.type as "BUILD" | "QUIT",
    goal: h.goal,
    position: h.position,
    loggedDates: new Set(h.logs.map((l) => l.date)),
  }));

  const today = monthEnd; // treat last day as "today" for a past month
  const weekStartsOn: 0 | 1 = user.weekStartsOn === 0 ? 0 : 1;
  const stats = computeMonthStats({ month, habits, moods, today, weekStartsOn });

  const pct = Math.round(stats.overallPct * 100);
  const label = monthLabel(month);

  return (
    <div className="recap">
      <header className="recap__header">
        <p className="recap__brand">{APP_NAME}</p>
        <h1 className="recap__title">
          {user.name ? `${user.name}'s` : "My"} {label} recap
        </h1>
        <p className="recap__pct">{pct}%</p>
        <p className="recap__sub">
          {stats.completedTotal} / {stats.goalTotal} habits completed
        </p>
      </header>

      <section className="recap__habits">
        {habits.map((h) => {
          const done = h.loggedDates.size;
          const total = daysInMonth(month);
          const hpct = Math.round((done / total) * 100);
          return (
            <div key={h.id} className="recaphabit">
              <span className="recaphabit__emoji">{h.emoji ?? "✅"}</span>
              <span className="recaphabit__name">{h.name}</span>
              <div className="recaphabit__bar">
                <div className="recaphabit__fill" style={{ width: `${hpct}%` }} />
              </div>
              <span className="recaphabit__pct">{hpct}%</span>
            </div>
          );
        })}
      </section>

      {moods.length > 0 && (
        <p className="recap__mood">
          Avg mood:{" "}
          <strong>
            {(moods.reduce((s, m) => s + m.value, 0) / moods.length).toFixed(1)} / 5
          </strong>{" "}
          over {moods.length} days tracked
        </p>
      )}

      <footer className="recap__footer">
        <p>
          Track your habits at{" "}
          <a href={process.env.NEXT_PUBLIC_APP_URL ?? "#"} className="recap__link">
            {APP_NAME}
          </a>
        </p>
      </footer>
    </div>
  );
}
