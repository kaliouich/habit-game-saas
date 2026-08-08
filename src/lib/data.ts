import { prisma } from "./prisma";
import { computeMonthStats, type HabitWithLogs, type MonthStats } from "./stats";
import { daysInMonth, expandDateRange, pad2, todayInTz, type MonthKey } from "./dates";

/**
 * Fenêtre d'historique chargée pour le dashboard (~3 ans).
 *
 * Sans borne, la requête ramenait TOUS les logs depuis la création du compte à
 * chaque affichage : le coût croît linéairement avec l'ancienneté (24 habitudes
 * × 3 ans ≈ 26 000 lignes) alors que l'écran n'en montre qu'un mois.
 *
 * Compromis assumé : `bestStreak` (« record absolu ») est donc calculé sur
 * cette fenêtre. Une série ininterrompue de plus de 3 ans serait tronquée —
 * cas inexistant en pratique pour un produit récent. Si le besoin d'un record
 * à vie apparaît, la bonne réponse est de dénormaliser `bestStreak` sur la
 * ligne Habit (mis à jour au toggle), pas d'élargir cette fenêtre.
 */
const LOG_LOOKBACK_DAYS = 1100;

function shiftIso(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

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

  // La borne basse doit couvrir DEUX besoins : le mois affiché (qui peut être
  // passé, un Pro navigue dans son historique) et la série en cours, qui elle
  // se calcule toujours à partir d'aujourd'hui. D'où le min des deux.
  const lookbackFloor = shiftIso(todayInTz(timezone), -LOG_LOOKBACK_DAYS);
  const monthStart = `${month}-01`;
  const logsFrom = monthStart < lookbackFloor ? monthStart : lookbackFloor;

  const [habitRows, moods, shields] = await Promise.all([
    prisma.habit.findMany({
      where: {
        userId,
        OR: [{ archivedAt: null }, { archivedAt: { gt: monthEndDate } }],
      },
      include: {
        logs: { where: { date: { gte: logsFrom } }, select: { date: true } },
        pauses: { select: { from: true, to: true } },
      },
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

/**
 * Données du rapport sur une plage arbitraire (Sprint 7). Distinct de
 * `getDashboardData`, qui est indexé sur un mois calendaire.
 */
export async function getReportData(userId: string, from: string, to: string) {
  const [habitRows, moods, shields] = await Promise.all([
    prisma.habit.findMany({
      where: {
        userId,
        OR: [{ archivedAt: null }, { archivedAt: { gt: new Date(`${to}T23:59:59Z`) } }],
      },
      include: {
        logs: { where: { date: { gte: from, lte: to } }, select: { date: true } },
        pauses: { select: { from: true, to: true } },
      },
      orderBy: { position: "asc" },
    }),
    prisma.moodLog.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: { date: true, value: true },
    }),
    prisma.streakShield.findMany({ where: { userId }, select: { date: true } }),
  ]);

  const shielded = shields.map((s) => s.date);

  return {
    habits: habitRows.map((h) => ({
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      loggedDates: new Set(h.logs.map((l) => l.date)),
      pausedDates: new Set([
        ...h.pauses.flatMap((p) => expandDateRange(p.from, p.to)),
        ...shielded,
      ]),
    })),
    moods,
  };
}
