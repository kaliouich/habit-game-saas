import { prisma } from "./prisma";
import { computeMonthStats, type HabitWithLogs, type MonthStats } from "./stats";
import { daysInMonth, pad2, todayInTz, type MonthKey } from "./dates";

export interface DashboardData {
  stats: MonthStats;
  habits: HabitWithLogs[];
  today: string;
  /** Habitudes non archivées — sert aux quotas de plan. */
  activeCount: number;
}

/** Une seule requête habits+logs (tous les logs : nécessaires aux streaks) + moods du mois. */
export async function getDashboardData(
  userId: string,
  month: MonthKey,
  timezone: string,
  weekStartsOn: 0 | 1,
): Promise<DashboardData> {
  const monthEnd = `${month}-${pad2(daysInMonth(month))}`;
  const monthEndDate = new Date(`${monthEnd}T23:59:59Z`);

  const [habitRows, moods] = await Promise.all([
    prisma.habit.findMany({
      where: {
        userId,
        OR: [{ archivedAt: null }, { archivedAt: { gt: monthEndDate } }],
      },
      include: { logs: { select: { date: true } } },
      orderBy: { position: "asc" },
    }),
    prisma.moodLog.findMany({
      where: { userId, date: { gte: `${month}-01`, lte: monthEnd } },
      select: { date: true, value: true },
    }),
  ]);

  const habits: HabitWithLogs[] = habitRows.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    type: h.type,
    goal: h.goal,
    position: h.position,
    loggedDates: new Set(h.logs.map((l) => l.date)),
  }));

  const today = todayInTz(timezone);
  const stats = computeMonthStats({ month, habits, moods, today, weekStartsOn });
  const activeCount = habitRows.filter((h) => h.archivedAt === null).length;

  return { stats, habits, today, activeCount };
}
