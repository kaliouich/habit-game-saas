/**
 * Dates calendaires pures. Convention projet : un "jour" est une string `YYYY-MM-DD`
 * dans le fuseau du user — jamais un DateTime UTC (voir AGENTS.md).
 */

export type ISODate = string; // "YYYY-MM-DD"
export type MonthKey = string; // "YYYY-MM"

/** Abréviations courtes (2 lettres) pour les colonnes serrées de la grille —
 *  volontairement pas Intl.DateTimeFormat({weekday:"short"}) : ça rendrait
 *  "dim."/"jue." selon la langue, plus large et de longueur variable, alors
 *  que la grille (voir MonthGrid.tsx) dépend de colonnes étroites et régulières. */
const DOW_LABELS: Record<string, readonly string[]> = {
  en: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  fr: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
  es: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"],
};

const WEEK_WORD: Record<string, string> = {
  en: "Week",
  fr: "Semaine",
  es: "Semana",
};

export interface DayInfo {
  date: ISODate;
  dayNum: number; // 1..31
  dow: string; // "We" (localisé)
}

export interface WeekGroup {
  label: string; // "Week 1"
  index: number; // 0-based
  days: DayInfo[];
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isValidMonthKey(v: unknown): v is MonthKey {
  if (typeof v !== "string" || !/^\d{4}-\d{2}$/.test(v)) return false;
  const m = Number(v.slice(5, 7));
  return m >= 1 && m <= 12;
}

export function daysInMonth(month: MonthKey): number {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthDays(month: MonthKey, locale: string = "en"): DayInfo[] {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const count = daysInMonth(month);
  const labels = DOW_LABELS[locale] ?? DOW_LABELS.en;
  const days: DayInfo[] = [];
  for (let d = 1; d <= count; d++) {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    days.push({ date: `${month}-${pad2(d)}`, dayNum: d, dow: labels[dow] });
  }
  return days;
}

/**
 * Groupes "Week 1..Week N" comme dans la vidéo : semaines calendaires du mois.
 * `weekStartsOn` : 0 = dimanche, 1 = lundi. Un mois peut produire jusqu'à 6 groupes.
 */
export function weeksOf(month: MonthKey, weekStartsOn: 0 | 1 = 1, locale: string = "en"): WeekGroup[] {
  const days = monthDays(month, locale);
  const word = WEEK_WORD[locale] ?? WEEK_WORD.en;
  const groups: WeekGroup[] = [];
  let current: DayInfo[] = [];
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  for (const day of days) {
    const dow = new Date(Date.UTC(y, m - 1, day.dayNum)).getUTCDay();
    if (dow === weekStartsOn && current.length > 0) {
      groups.push({ label: `${word} ${groups.length + 1}`, index: groups.length, days: current });
      current = [];
    }
    current.push(day);
  }
  if (current.length > 0) {
    groups.push({ label: `${word} ${groups.length + 1}`, index: groups.length, days: current });
  }
  return groups;
}

/** "YYYY-MM-DD" du moment présent dans un fuseau IANA donné. */
export function todayInTz(timezone: string): ISODate {
  // en-CA formate en YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isFuture(date: ISODate, timezone: string): boolean {
  return date > todayInTz(timezone);
}

export function monthOf(date: ISODate): MonthKey {
  return date.slice(0, 7);
}

export function currentMonth(timezone: string): MonthKey {
  return monthOf(todayInTz(timezone));
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1 + delta;
  const ny = y + Math.floor(m / 12);
  const nm = ((m % 12) + 12) % 12;
  return `${ny}-${pad2(nm + 1)}`;
}

export function monthLabel(month: MonthKey, locale = "en"): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

/** Veille d'une date calendaire. */
export function prevDay(date: ISODate): ISODate {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

/** Toutes les dates entre `from` et `to` inclus (pause / vacation mode, Sprint 6). */
export function expandDateRange(from: ISODate, to: ISODate): ISODate[] {
  const dates: ISODate[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 3660) {
    // borne haute : 10 ans, garde-fou contre une plage mal formée
    dates.push(cursor);
    const y = Number(cursor.slice(0, 4));
    const m = Number(cursor.slice(5, 7));
    const d = Number(cursor.slice(8, 10));
    const t = new Date(Date.UTC(y, m - 1, d + 1));
    cursor = `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
    guard++;
  }
  return dates;
}
