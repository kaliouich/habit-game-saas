/**
 * Statistiques de rapport sur une période arbitraire (Sprint 7).
 *
 * `stats.ts` raisonne par mois calendaire (c'est ce que le dashboard affiche).
 * Le rapport, lui, doit couvrir « les 30 derniers jours », « cette année », ou
 * une plage saisie à la main — d'où ce module séparé plutôt qu'un mois élargi
 * de force. Fonctions pures, unit-testées, aucune I/O.
 */
import { expandDateRange, prevDay, type ISODate } from "./dates";

export interface ReportHabit {
  id: string;
  name: string;
  emoji: string | null;
  loggedDates: Set<ISODate>;
  pausedDates?: Set<ISODate>;
}

export interface ReportHabitRow {
  habitId: string;
  name: string;
  emoji: string | null;
  done: number;
  goal: number;
  pct: number; // 0..1
  currentStreak: number;
  bestStreak: number;
}

export interface ReportDay {
  date: ISODate;
  done: number;
  total: number;
  pct: number; // 0..1
}

export interface WeekdayStat {
  /** 0 = dimanche … 6 = samedi (getUTCDay). */
  weekday: number;
  label: string;
  pct: number; // 0..1
  days: number; // nombre de jours de ce type dans la période
}

export interface ReportStats {
  from: ISODate;
  to: ISODate;
  days: ReportDay[];
  byHabit: ReportHabitRow[];
  byWeekday: WeekdayStat[];
  totalDone: number;
  totalGoal: number;
  overallPct: number;
  perfectDays: number;
  bestStreak: number;
  avgMood: number | null;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekdayOf(date: ISODate): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Série en cours à la fin de la période — pas « à aujourd'hui » : un rapport
 * sur un mois passé doit décrire ce mois, pas l'état actuel de l'habitude.
 */
function streakEndingAt(logged: Set<ISODate>, end: ISODate, paused: Set<ISODate>): number {
  let cursor = logged.has(end) ? end : prevDay(end);
  let count = 0;
  while (logged.has(cursor) || paused.has(cursor)) {
    if (logged.has(cursor)) count++;
    cursor = prevDay(cursor);
  }
  return count;
}

/** Plus longue série strictement contenue dans [from, to]. */
function bestStreakInRange(logged: Set<ISODate>, dates: ISODate[], paused: Set<ISODate>): number {
  let best = 0;
  let run = 0;
  for (const d of dates) {
    if (logged.has(d)) {
      run++;
      if (run > best) best = run;
    } else if (paused.has(d)) {
      // un jour protégé/en pause ne compte pas mais n'interrompt pas
      continue;
    } else {
      run = 0;
    }
  }
  return best;
}

export function computeReport(params: {
  habits: ReportHabit[];
  from: ISODate;
  to: ISODate;
  moods: { date: ISODate; value: number | null }[];
}): ReportStats {
  const { habits, from, to, moods } = params;
  const dates = expandDateRange(from, to);
  const nHabits = habits.length;

  const days: ReportDay[] = dates.map((date) => {
    const done = habits.reduce((n, h) => n + (h.loggedDates.has(date) ? 1 : 0), 0);
    return { date, done, total: nHabits, pct: nHabits === 0 ? 0 : done / nHabits };
  });

  const byHabit: ReportHabitRow[] = habits.map((h) => {
    const paused = h.pausedDates ?? new Set<ISODate>();
    const done = dates.reduce((n, d) => n + (h.loggedDates.has(d) ? 1 : 0), 0);
    const goal = dates.length;
    return {
      habitId: h.id,
      name: h.name,
      emoji: h.emoji,
      done,
      goal,
      pct: goal === 0 ? 0 : done / goal,
      currentStreak: streakEndingAt(h.loggedDates, to, paused),
      bestStreak: bestStreakInRange(h.loggedDates, dates, paused),
    };
  });

  // Moyenne par jour de la semaine — sert à repérer le jour faible ("tu sautes
  // surtout le samedi"), ce qu'un total mensuel masque complètement.
  const buckets = new Map<number, { sum: number; n: number }>();
  for (const day of days) {
    const w = weekdayOf(day.date);
    const b = buckets.get(w) ?? { sum: 0, n: 0 };
    b.sum += day.pct;
    b.n += 1;
    buckets.set(w, b);
  }
  const byWeekday: WeekdayStat[] = [...buckets.entries()]
    .map(([weekday, b]) => ({
      weekday,
      label: WEEKDAY_LABELS[weekday],
      pct: b.n === 0 ? 0 : b.sum / b.n,
      days: b.n,
    }))
    .sort((a, b) => a.weekday - b.weekday);

  const totalDone = byHabit.reduce((n, h) => n + h.done, 0);
  const totalGoal = byHabit.reduce((n, h) => n + h.goal, 0);
  const perfectDays = nHabits === 0 ? 0 : days.filter((d) => d.done === nHabits).length;
  const bestStreak = byHabit.reduce((m, h) => Math.max(m, h.bestStreak), 0);

  // value est nullable depuis l'ajout de motivation (une entrée peut ne
  // renseigner que l'une des deux) — exclu ici, pas juste absent de la range.
  const inRange = moods.filter(
    (m): m is { date: ISODate; value: number } => m.value !== null && m.date >= from && m.date <= to,
  );
  const avgMood = inRange.length === 0 ? null : inRange.reduce((s, m) => s + m.value, 0) / inRange.length;

  return {
    from,
    to,
    days,
    byHabit,
    byWeekday,
    totalDone,
    totalGoal,
    overallPct: totalGoal === 0 ? 0 : totalDone / totalGoal,
    perfectDays,
    bestStreak,
    avgMood,
  };
}
