/** Nom produit — jamais hardcodé ailleurs (AGENTS.md règle 8). */
export const APP_NAME = "Habit Game";

export const PLAN_LIMITS = {
  FREE: { maxHabits: 3, historyMonths: 0 }, // 0 = mois courant uniquement
  PRO: { maxHabits: 24, historyMonths: Infinity },
} as const;

export const MOODS = [
  { value: 1, emoji: "😞", label: "Awful" },
  { value: 2, emoji: "😕", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;
