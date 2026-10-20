/**
 * Planification des rappels par habitude (notifications locales de l'app
 * native). Fonction pure, sans Capacitor : testable, et le composant client
 * n'a plus qu'à traduire le plan en appels au plugin.
 *
 * Un rappel quotidien = une notification répétée ; une habitude à jours
 * prévus = une notification hebdomadaire par jour prévu, pour ne pas
 * sonner les jours de repos.
 */
export const HABIT_REMINDER_ID_BASE = 100_000;
const SLOTS_PER_HABIT = 8; // 0 = quotidien, 1..7 = un jour de semaine

export interface ReminderHabit {
  id: string;
  name: string;
  emoji: string | null;
  type: "BUILD" | "QUIT";
  reminderTime?: string | null;
  scheduleDays?: number[];
}

export interface PlannedReminder {
  /** Identifiant entier de notification, stable pour une même habitude + jour. */
  id: number;
  habitId: string;
  habitName: string;
  emoji: string | null;
  hour: number;
  minute: number;
  /** Convention Capacitor : 1 = dimanche … 7 = samedi. Absent = tous les jours. */
  weekday?: number;
}

/** FNV-1a 32 bits — suffisant pour répartir des ids de habitudes dans 100 000 cases. */
function hashId(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 100_000;
}

export function parseReminderTime(time: string | null | undefined): { hour: number; minute: number } | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time ?? "");
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

export function planHabitReminders(habits: readonly ReminderHabit[]): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const h of habits) {
    if (h.type !== "BUILD") continue;
    const t = parseReminderTime(h.reminderTime);
    if (!t) continue;
    const base = HABIT_REMINDER_ID_BASE + hashId(h.id) * SLOTS_PER_HABIT;
    const days = [...new Set(h.scheduleDays ?? [])].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
    const common = { habitId: h.id, habitName: h.name, emoji: h.emoji, ...t };
    if (days.length === 0 || days.length === 7) {
      out.push({ ...common, id: base });
    } else {
      for (const d of days) out.push({ ...common, id: base + 1 + d, weekday: d + 1 });
    }
  }
  return out;
}
