import type { HabitUnitKey } from "./config";

/** Habitude proposée, avant création réelle — même forme que CreateHabitSchema
 *  (src/lib/actions/habits.ts) pour que createHabitsFromSelection n'ait rien
 *  à retraiter, plus `rationale` (chemin IA uniquement, affiché dans Review). */
export interface HabitDraft {
  name: string;
  emoji: string;
  type: "BUILD" | "QUIT";
  unit: HabitUnitKey;
  targetValue?: number | null;
  unitLabel?: string;
  rationale?: string;
}

export const FOCUS_AREAS = [
  { key: "fitness", label: "Health & Fitness", emoji: "💪" },
  { key: "mind", label: "Mind & Focus", emoji: "🧘" },
  { key: "productivity", label: "Productivity", emoji: "🎯" },
  { key: "quit", label: "Breaking a habit", emoji: "🚭" },
  { key: "sleep", label: "Sleep & Energy", emoji: "😴" },
  { key: "general", label: "General self-improvement", emoji: "✨" },
] as const;

export type FocusKey = (typeof FOCUS_AREAS)[number]["key"];

export const TIME_BUDGETS = [
  { key: "tiny", label: "Under 10 minutes" },
  { key: "short", label: "10–30 minutes" },
  { key: "medium", label: "30–60 minutes" },
  { key: "long", label: "1 hour or more" },
] as const;

export type TimeBudgetKey = (typeof TIME_BUDGETS)[number]["key"];

export const ENERGY_TIMES = [
  { key: "morning", label: "Early morning" },
  { key: "day", label: "During the day" },
  { key: "evening", label: "Evening" },
  { key: "varies", label: "It varies" },
] as const;

export type EnergyKey = (typeof ENERGY_TIMES)[number]["key"];

/** Cible par défaut pour une habitude MINUTES, biaisée par le budget temps —
 *  pas de nouveau champ data model pour ça, juste le nombre qu'on pré-remplit. */
function minutesFor(time: TimeBudgetKey, generous: number): number {
  if (time === "tiny") return Math.max(5, Math.round(generous * 0.3));
  if (time === "short") return Math.round(generous * 0.6);
  return generous;
}

/** Table statique focus → candidats — aucun appel IA sur ce chemin : rapide,
 *  gratuit, jamais faux d'une façon qui nécessiterait une review. */
export function candidatesFor(focus: FocusKey, time: TimeBudgetKey): HabitDraft[] {
  switch (focus) {
    case "fitness":
      return [
        { name: "Gym", emoji: "🏋️", type: "BUILD", unit: "TIMES" },
        { name: "Walk", emoji: "🚶", type: "BUILD", unit: "STEPS", targetValue: 10000 },
        { name: "Drink water", emoji: "💧", type: "BUILD", unit: "COUNT", targetValue: 8, unitLabel: "glasses" },
        { name: "Eat more veggies", emoji: "🥗", type: "BUILD", unit: "TIMES" },
        { name: "Stretch", emoji: "🧎", type: "BUILD", unit: "MINUTES", targetValue: minutesFor(time, 15) },
        { name: "Sleep by 11pm", emoji: "🌙", type: "BUILD", unit: "TIMES" },
      ];
    case "mind":
      return [
        { name: "Meditate", emoji: "🧘", type: "BUILD", unit: "MINUTES", targetValue: minutesFor(time, 20) },
        { name: "Journal", emoji: "📓", type: "BUILD", unit: "MINUTES", targetValue: minutesFor(time, 10) },
        { name: "Read", emoji: "📖", type: "BUILD", unit: "MINUTES", targetValue: minutesFor(time, 30) },
        { name: "Deep work block", emoji: "🎯", type: "BUILD", unit: "HOURS", targetValue: 1 },
        { name: "Digital detox hour", emoji: "📵", type: "BUILD", unit: "TIMES" },
        { name: "Gratitude note", emoji: "🙏", type: "BUILD", unit: "TIMES" },
      ];
    case "productivity":
      return [
        { name: "Day planning", emoji: "📅", type: "BUILD", unit: "TIMES" },
        { name: "Project work", emoji: "🎯", type: "BUILD", unit: "HOURS", targetValue: minutesFor(time, 120) / 60 },
        { name: "Inbox zero", emoji: "📬", type: "BUILD", unit: "TIMES" },
        { name: "No procrastination window", emoji: "⏱️", type: "BUILD", unit: "MINUTES", targetValue: minutesFor(time, 25) },
        { name: "Weekly review", emoji: "🗂️", type: "BUILD", unit: "TIMES" },
        { name: "Wake up at 6", emoji: "⏰", type: "BUILD", unit: "TIMES" },
      ];
    case "quit":
      return [
        { name: "No alcohol", emoji: "🍾", type: "QUIT", unit: "TIMES" },
        { name: "No smoking", emoji: "🚬", type: "QUIT", unit: "TIMES" },
        { name: "Less social media", emoji: "📱", type: "QUIT", unit: "TIMES" },
        { name: "No junk food", emoji: "🍔", type: "QUIT", unit: "TIMES" },
        { name: "No late-night screens", emoji: "🌃", type: "QUIT", unit: "TIMES" },
        { name: "No nail biting", emoji: "💅", type: "QUIT", unit: "TIMES" },
      ];
    case "sleep":
      return [
        { name: "Sleep by 11pm", emoji: "🌙", type: "BUILD", unit: "TIMES" },
        { name: "No screens before bed", emoji: "📵", type: "QUIT", unit: "TIMES" },
        { name: "Morning sunlight", emoji: "☀️", type: "BUILD", unit: "MINUTES", targetValue: minutesFor(time, 15) },
        { name: "Cold shower", emoji: "🚿", type: "BUILD", unit: "TIMES" },
        { name: "No caffeine after 2pm", emoji: "☕", type: "QUIT", unit: "TIMES" },
        { name: "Wind-down routine", emoji: "🕯️", type: "BUILD", unit: "MINUTES", targetValue: minutesFor(time, 15) },
      ];
    case "general":
    default:
      return [
        { name: "Wake up at 6", emoji: "⏰", type: "BUILD", unit: "TIMES" },
        { name: "Gym", emoji: "🏋️", type: "BUILD", unit: "TIMES" },
        { name: "Reading / Learning", emoji: "📖", type: "BUILD", unit: "MINUTES", targetValue: minutesFor(time, 20) },
        { name: "Day planning", emoji: "📅", type: "BUILD", unit: "TIMES" },
        { name: "No social media", emoji: "🌿", type: "QUIT", unit: "TIMES" },
        { name: "Cold shower", emoji: "🚿", type: "BUILD", unit: "TIMES" },
      ];
  }
}
