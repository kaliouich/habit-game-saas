import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma/client";
import { computeMonthStats, computeQuitStreak, deriveLoggedDates, type HabitWithLogs, type MonthStats, type QuitStreak } from "./stats";
import { daysInMonth, expandDateRange, pad2, todayInTz, type MonthKey } from "./dates";
import type { JournalBlock } from "./journal";

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
  /** QUIT uniquement (Phase 2 roadmap), clé = habitId. */
  quitStreaks: Map<string, QuitStreak>;
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
        logs: { where: { date: { gte: logsFrom } }, select: { date: true, value: true } },
        pauses: { select: { from: true, to: true } },
        relapses: { select: { occurredAt: true } }, // QUIT uniquement — vide pour BUILD
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
    loggedDates: deriveLoggedDates(h.logs, h.targetValue),
    // Un bouclier vaut pour TOUTES les habitudes : même effet qu'une pause,
    // d'où la fusion ici plutôt qu'une branche dans le calcul de série.
    pausedDates: new Set([
      ...h.pauses.flatMap((p) => expandDateRange(p.from, p.to)),
      ...shieldedAll,
    ]),
    tags: h.tags,
    quitStartedAt: h.quitStartedAt,
    unit: h.unit,
    targetValue: h.targetValue,
    unitLabel: h.unitLabel,
    logValues: new Map(h.logs.map((l) => [l.date, l.value])),
  }));

  const today = todayInTz(timezone);
  // QUIT ne produit plus de HabitLog (Phase 2 roadmap) : mélangée aux formules
  // BUILD, elle y compterait comme un 0 permanent (progrès quotidien, badges,
  // "perfect day"…). Ces formules ne concernent donc que BUILD.
  const buildHabits = habits.filter((h) => h.type === "BUILD");
  const stats = computeMonthStats({ month, habits: buildHabits, moods, today, weekStartsOn });
  const activeCount = habitRows.filter((h) => h.archivedAt === null).length;

  const shieldedDates = shieldedAll.filter((d) => d >= `${month}-01` && d <= monthEnd);

  const now = new Date();
  const quitStreaks = new Map<string, QuitStreak>();
  for (const h of habitRows) {
    if (h.type !== "QUIT") continue;
    quitStreaks.set(
      h.id,
      computeQuitStreak(
        h.createdAt,
        h.relapses.map((r) => r.occurredAt),
        now,
      ),
    );
  }

  return { stats, habits, today, activeCount, shieldedDates, quitStreaks };
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
        // Le rapport (jours cochés / série) ne s'applique qu'à BUILD : QUIT ne
        // produit plus de HabitLog depuis la Phase 2 roadmap (compteur d'arrêt).
        type: "BUILD",
        OR: [{ archivedAt: null }, { archivedAt: { gt: new Date(`${to}T23:59:59Z`) } }],
      },
      include: {
        logs: { where: { date: { gte: from, lte: to } }, select: { date: true, value: true } },
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
      loggedDates: deriveLoggedDates(h.logs, h.targetValue),
      pausedDates: new Set([
        ...h.pauses.flatMap((p) => expandDateRange(p.from, p.to)),
        ...shielded,
      ]),
    })),
    moods,
  };
}

export interface TaskRow {
  id: string;
  title: string;
  dueDate: string | null;
  priority: boolean;
  completedAt: Date | null;
}

/**
 * Phase 4 roadmap (minimal). "Pertinent aujourd'hui" = pas d'échéance, en
 * retard, ou dû aujourd'hui — plus tout ce qui a été coché aujourd'hui (reste
 * visible barré le temps de la session, cohérent avec les captures
 * concurrentes). Pas d'archivage automatique : liste bornée par `take`, le
 * ménage (suppression) reste manuel — cohérent avec l'absence de récurrence.
 */
export async function getTasksForDashboard(userId: string, today: string): Promise<TaskRow[]> {
  return prisma.task.findMany({
    where: {
      userId,
      OR: [
        { completedAt: null, OR: [{ dueDate: null }, { dueDate: { lte: today } }] },
        { completedAt: { gte: new Date(`${today}T00:00:00Z`) } },
      ],
    },
    select: { id: true, title: true, dueDate: true, priority: true, completedAt: true },
    // nulls: "first" — les tâches incomplètes (completedAt=null) doivent
    // précéder les cochées, l'inverse du défaut Postgres (NULLS LAST en ASC).
    orderBy: [{ completedAt: { sort: "asc", nulls: "first" } }, { dueDate: "asc" }, { position: "asc" }],
    take: 100,
  });
}

export interface JournalEntryRow {
  id: string;
  habitId: string | null;
  habitName: string | null;
  habitEmoji: string | null;
  date: string;
  title: string | null;
  content: JournalBlock[];
  createdAt: Date;
}

/**
 * Phase 3 roadmap. `query` passe par la colonne `searchVector` (tsvector
 * généré, voir migration 20260817164631) via `websearch_to_tsquery` — gère
 * nativement guillemets/opérateurs. `$queryRaw` avec template tagué paramètre
 * la requête (jamais d'interpolation de chaîne) : pas d'injection SQL.
 */
export async function getJournalEntries(
  userId: string,
  opts: { habitId?: string; query?: string; limit?: number } = {},
): Promise<JournalEntryRow[]> {
  const { habitId, query, limit = 50 } = opts;

  const habitFilter = habitId ? Prisma.sql`AND je."habitId" = ${habitId}` : Prisma.empty;
  const searchFilter = query?.trim()
    ? Prisma.sql`AND je."searchVector" @@ websearch_to_tsquery('english', ${query.trim()})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    {
      id: string;
      habitId: string | null;
      habitName: string | null;
      habitEmoji: string | null;
      date: string;
      title: string | null;
      content: JournalBlock[];
      createdAt: Date;
    }[]
  >`
    SELECT je."id", je."habitId", h."name" AS "habitName", h."emoji" AS "habitEmoji",
           je."date", je."title", je."content", je."createdAt"
    FROM "JournalEntry" je
    LEFT JOIN "Habit" h ON h."id" = je."habitId"
    WHERE je."userId" = ${userId}
    ${habitFilter}
    ${searchFilter}
    ORDER BY je."date" DESC, je."createdAt" DESC
    LIMIT ${limit}
  `;

  return rows;
}
