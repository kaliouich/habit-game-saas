import { prisma } from "./prisma";
import { computeMonthStats, type HabitWithLogs, type MonthStats } from "./stats";
import { daysInMonth, expandDateRange, pad2, todayInTz, type MonthKey } from "./dates";

export interface DashboardData {
  stats: MonthStats;
  habits: HabitWithLogs[];
  today: string;
  /** Habitudes non archivées — sert aux quotas de plan. */
  activeCount: number;
  /** Boucliers consommés ce mois-ci (dates) — sert au compteur restant en UI. */
  shieldedDates: string[];
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

  const [habitRows, moods, shields] = await Promise.all([
    prisma.habit.findMany({
      where: {
        userId,
        OR: [{ archivedAt: null }, { archivedAt: { gt: monthEndDate } }],
      },
      include: { logs: { select: { date: true } }, pauses: { select: { from: true, to: true } } },
      orderBy: { position: "asc" },
    }),
    prisma.moodLog.findMany({
      where: { userId, date: { gte: `${month}-01`, lte: monthEnd } },
      select: { date: true, value: true },
    }),
    // Tous les boucliers, pas seulement ceux du mois : les streaks remontent
    // au-delà du mois affiché, donc un bouclier plus ancien doit rester pris
    // en compte pour ne pas "recasser" une série déjà réparée.
    prisma.streakShield.findMany({ where: { userId }, select: { date: true } }),
  ]);

  const shieldedAll = shields.map((s) => s.date);

  const habits: HabitWithLogs[] = habitRows.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    type: h.type,
    goal: h.goal,
    position: h.position,
    loggedDates: new Set(h.logs.map((l) => l.date)),
    // Un bouclier vaut pour TOUTES les habitudes : même effet qu'une pause,
    // d'où la fusion ici plutôt qu'une branche dans le calcul de série.
    pausedDates: new Set([
      ...h.pauses.flatMap((p) => expandDateRange(p.from, p.to)),
      ...shieldedAll,
    ]),
    tags: h.tags,
  }));

  const today = todayInTz(timezone);
  const stats = computeMonthStats({ month, habits, moods, today, weekStartsOn });
  const activeCount = habitRows.filter((h) => h.archivedAt === null).length;

  const shieldedDates = shieldedAll.filter((d) => d >= `${month}-01` && d <= monthEnd);

  return { stats, habits, today, activeCount, shieldedDates };
}
