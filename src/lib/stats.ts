/**
 * TOUTES les formules du dashboard (PLAN.md §5). Fonctions pures, unit-testées.
 * Aucun composant ne recalcule quoi que ce soit : il consomme `MonthStats`.
 */
import {
  type ISODate,
  type MonthKey,
  type WeekGroup,
  daysInMonth,
  monthDays,
  weeksOf,
  prevDay,
  monthOf,
} from "./dates";
import { RANKS } from "./config";

export interface HabitWithLogs {
  id: string;
  name: string;
  emoji: string | null;
  type: "BUILD" | "QUIT";
  goal: number | null; // null = auto (nb de jours du mois)
  position: number;
  /** Dates cochées — peut contenir des dates hors mois (utilisées pour les streaks). */
  loggedDates: Set<ISODate>;
  /** Jours en pause / vacation mode (Pro) — n'entrent ni ne cassent un streak. */
  pausedDates?: Set<ISODate>;
  /** Tags libres (Pro) — non utilisés par les formules ci-dessous, portés pour l'UI. */
  tags?: string[];
}

export interface HabitAnalysis {
  habitId: string;
  name: string;
  emoji: string | null;
  goal: number;
  actual: number;
  left: number;
  pct: number; // 0..1
}

export interface HabitStreak {
  habitId: string;
  current: number;
  best: number;
}

export interface MonthStats {
  month: MonthKey;
  days: ReturnType<typeof monthDays>;
  weeks: WeekGroup[];
  /** % par jour (0..1), null pour les jours futurs (V4). */
  dailyProgress: (number | null)[];
  /** % par semaine calendaire (V5). */
  weeklyProgress: { label: string; pct: number | null }[];
  goalTotal: number; // V6
  completedTotal: number; // V6
  leftTotal: number; // V6
  overallPct: number; // V7 (0..1)
  analysis: HabitAnalysis[]; // V8, ordre = position sidebar
  top10: HabitAnalysis[]; // V9
  streaks: Map<string, HabitStreak>; // B1
  perfectDays: Set<ISODate>; // B5
  moodByDate: Map<ISODate, number>; // V10
}

/**
 * Série en cours : jours consécutifs cochés en remontant depuis `today` (ou hier
 * si today pas coché). `paused` (vacation mode, Pro) : les jours dans cet
 * ensemble sont traversés sans compter ET sans casser la série.
 */
export function currentStreak(
  logged: Set<ISODate>,
  today: ISODate,
  paused: Set<ISODate> = new Set(),
): number {
  let cursor = logged.has(today) ? today : prevDay(today);
  let count = 0;
  while (logged.has(cursor) || paused.has(cursor)) {
    if (logged.has(cursor)) count++;
    cursor = prevDay(cursor);
  }
  return count;
}

/** Record absolu de jours consécutifs (mêmes règles de pause que currentStreak). */
export function bestStreak(logged: Set<ISODate>, paused: Set<ISODate> = new Set()): number {
  let best = 0;
  for (const date of logged) {
    // départ de série uniquement : la veille n'est ni cochée ni en pause
    if (logged.has(prevDay(date)) || paused.has(prevDay(date))) continue;
    let len = 0;
    let cursor = date;
    while (logged.has(cursor) || paused.has(cursor)) {
      if (logged.has(cursor)) len++;
      const y = Number(cursor.slice(0, 4));
      const m = Number(cursor.slice(5, 7));
      const d = Number(cursor.slice(8, 10));
      const t = new Date(Date.UTC(y, m - 1, d + 1));
      cursor = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
    }
    if (len > best) best = len;
  }
  return best;
}

export function computeMonthStats(params: {
  month: MonthKey;
  habits: HabitWithLogs[];
  moods: { date: ISODate; value: number }[];
  today: ISODate;
  weekStartsOn?: 0 | 1;
}): MonthStats {
  const { month, habits, moods, today, weekStartsOn = 1 } = params;
  const days = monthDays(month);
  const weeks = weeksOf(month, weekStartsOn);
  const nDays = daysInMonth(month);
  const habitCount = habits.length;

  const inMonth = (d: ISODate) => monthOf(d) === month;
  const isPastOrToday = (d: ISODate) => d <= today;

  // V4 — Daily Progress
  const dailyProgress = days.map((day) => {
    if (!isPastOrToday(day.date) || habitCount === 0) return null;
    let done = 0;
    for (const h of habits) if (h.loggedDates.has(day.date)) done++;
    return done / habitCount;
  });

  // V5 — Weekly Progress (moyenne des jours écoulés de la semaine)
  const weeklyProgress = weeks.map((w) => {
    const vals = w.days
      .map((d) => dailyProgress[d.dayNum - 1])
      .filter((v): v is number => v !== null);
    return { label: w.label, pct: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
  });

  // V8 — Analysis par habitude
  const analysis: HabitAnalysis[] = habits.map((h) => {
    const goal = h.goal ?? nDays;
    let actual = 0;
    for (const d of h.loggedDates) if (inMonth(d)) actual++;
    const left = Math.max(0, goal - actual);
    return {
      habitId: h.id,
      name: h.name,
      emoji: h.emoji,
      goal,
      actual,
      left,
      pct: goal > 0 ? Math.min(1, actual / goal) : 0,
    };
  });

  // V6 + V7 — totaux et % global
  const goalTotal = analysis.reduce((a, x) => a + x.goal, 0);
  const completedTotal = analysis.reduce((a, x) => a + x.actual, 0);
  const leftTotal = Math.max(0, goalTotal - completedTotal);
  const overallPct = goalTotal > 0 ? completedTotal / goalTotal : 0;

  // V9 — Top 10
  const top10 = [...analysis].sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name)).slice(0, 10);

  // B1 — Streaks (utilisent les logs hors mois si fournis, pauses = Sprint 6)
  const streaks = new Map<string, HabitStreak>();
  for (const h of habits) {
    streaks.set(h.id, {
      habitId: h.id,
      current: currentStreak(h.loggedDates, today, h.pausedDates),
      best: bestStreak(h.loggedDates, h.pausedDates),
    });
  }

  // B5 — Perfect days
  const perfectDays = new Set<ISODate>();
  days.forEach((day, i) => {
    if (dailyProgress[i] === 1) perfectDays.add(day.date);
  });

  // V10 — Mood
  const moodByDate = new Map<ISODate, number>();
  for (const m of moods) if (inMonth(m.date)) moodByDate.set(m.date, m.value);

  return {
    month,
    days,
    weeks,
    dailyProgress,
    weeklyProgress,
    goalTotal,
    completedTotal,
    leftTotal,
    overallPct,
    analysis,
    top10,
    streaks,
    perfectDays,
    moodByDate,
  };
}

export interface WeeklyRecap {
  completed: number;
  goal: number;
  pct: number; // 0..1
  daysActive: number; // jours des 7 derniers où au moins une habitude a été cochée
  bestStreakHabit: { name: string; emoji: string | null; streak: number } | null;
}

/**
 * Récap glissant des 7 derniers jours (peut chevaucher deux mois) — utilisé par
 * le pipeline d'email hebdomadaire (Sprint 5), indépendant de `computeMonthStats`.
 */
export function computeWeeklyRecap(habits: HabitWithLogs[], today: ISODate): WeeklyRecap {
  const last7: ISODate[] = [];
  let cursor = today;
  for (let i = 0; i < 7; i++) {
    last7.push(cursor);
    cursor = prevDay(cursor);
  }

  let completed = 0;
  let daysActive = 0;
  for (const day of last7) {
    let any = false;
    for (const h of habits) {
      if (h.loggedDates.has(day)) {
        completed++;
        any = true;
      }
    }
    if (any) daysActive++;
  }

  const goal = habits.length * 7;

  let bestStreakHabit: WeeklyRecap["bestStreakHabit"] = null;
  for (const h of habits) {
    const streak = currentStreak(h.loggedDates, today, h.pausedDates);
    if (streak > 0 && (!bestStreakHabit || streak > bestStreakHabit.streak)) {
      bestStreakHabit = { name: h.name, emoji: h.emoji, streak };
    }
  }

  return { completed, goal, pct: goal > 0 ? completed / goal : 0, daysActive, bestStreakHabit };
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** FREE voit les badges "free", PRO voit tout (Sprint 6 — monétisation). */
  tier: "free" | "pro";
}

const STREAK_THRESHOLDS = [
  { days: 100, emoji: "💎", label: "100-Day Streak", tier: "pro" as const },
  { days: 30, emoji: "🔥", label: "30-Day Streak", tier: "pro" as const },
  { days: 7, emoji: "🔥", label: "7-Day Streak", tier: "free" as const },
];

/**
 * Badges dérivés de `MonthStats` + de l'historique complet des habitudes —
 * rien n'est stocké en base (règle projet : aucune duplication des stats),
 * tout est recalculé à l'affichage. B1/B5 (Sprint 5) + badges lifetime (Sprint 6).
 */
export function computeBadges(stats: MonthStats, habits: { loggedDates: Set<ISODate> }[]): Badge[] {
  const badges: Badge[] = [];

  // Perfect week(s) : toutes les semaines entièrement écoulées à 100% (un jour
  // futur ou incomplet exclut naturellement la semaine, via perfectDays).
  const perfectWeeks = stats.weeks.filter((w) => w.days.every((d) => stats.perfectDays.has(d.date)));
  if (perfectWeeks.length > 0) {
    badges.push({
      id: "perfect_week",
      emoji: "🏅",
      title: perfectWeeks.length === 1 ? "Perfect Week" : `${perfectWeeks.length} Perfect Weeks`,
      description: "Every habit, every day, for a full week.",
      tier: "pro",
    });
  }

  // Perfect days (seuil pour éviter le bruit en tout début de mois)
  if (stats.perfectDays.size >= 3) {
    badges.push({
      id: "perfect_days",
      emoji: "🌟",
      title: `${stats.perfectDays.size} Perfect Days`,
      description: "Days where every habit was checked off.",
      tier: "free",
    });
  }

  // Mois parfait
  if (stats.goalTotal > 0 && stats.completedTotal === stats.goalTotal) {
    badges.push({
      id: "full_month",
      emoji: "👑",
      title: "Perfect Month",
      description: "Every goal hit, every habit, the whole month.",
      tier: "pro",
    });
  }

  // Streaks par habitude — un seul badge (le plus haut palier atteint) par habitude
  for (const analysis of stats.analysis) {
    const streak = stats.streaks.get(analysis.habitId);
    if (!streak) continue;
    const tier = STREAK_THRESHOLDS.find((t) => streak.current >= t.days);
    if (tier) {
      badges.push({
        id: `streak_${analysis.habitId}`,
        emoji: tier.emoji,
        title: `${tier.label} — ${analysis.name}`,
        description: `${streak.current} days in a row.`,
        tier: tier.tier,
      });
    }
  }

  // Lifetime — utilisent `habits[].loggedDates` (historique complet, pas juste le mois affiché).
  const totalTicks = habits.reduce((sum, h) => sum + h.loggedDates.size, 0);
  if (totalTicks >= 100) {
    badges.push({
      id: "century",
      emoji: "💯",
      title: "Century",
      description: `${totalTicks} completions, lifetime.`,
      tier: "pro",
    });
  }

  const everBest = habits.reduce((best, h) => Math.max(best, bestStreak(h.loggedDates)), 0);
  if (everBest >= 60) {
    badges.push({
      id: "dedication",
      emoji: "🏔",
      title: "Dedication",
      description: `${everBest}-day streak, your best ever.`,
      tier: "pro",
    });
  }

  return badges;
}

export interface Rank {
  key: string;
  label: string;
  emblem: string;
  minLevel: number;
}

export interface LifetimeProgress {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  rank: Rank;
  /** Prochain rang à atteindre — null quand le rang max est déjà tenu. */
  nextRank: Rank | null;
}

const XP_PER_TICK = 10;
const XP_PER_LEVEL = 500;

/** Rang le plus élevé dont `minLevel` est atteint. */
export function rankForLevel(level: number): Rank {
  let current: Rank = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.minLevel) current = r;
  }
  return current;
}

function nextRankForLevel(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null;
}

/**
 * XP et niveau dérivés du nombre total de logs, toutes habitudes et tous mois
 * confondus — pas de compteur persisté (mêmes raisons que les badges : un
 * compteur incrémental pourrait diverger si un log est supprimé/une habitude
 * archivée, alors que `loggedDates.size` ne peut jamais être faux).
 */
export function computeLifetimeProgress(habits: { loggedDates: Set<ISODate> }[]): LifetimeProgress {
  const totalTicks = habits.reduce((sum, h) => sum + h.loggedDates.size, 0);
  const xp = totalTicks * XP_PER_TICK;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return {
    xp,
    level,
    xpIntoLevel: xp % XP_PER_LEVEL,
    xpForNextLevel: XP_PER_LEVEL,
    rank: rankForLevel(level),
    nextRank: nextRankForLevel(level),
  };
}
