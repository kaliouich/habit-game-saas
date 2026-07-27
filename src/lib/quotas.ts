import { PLAN_LIMITS } from "./config";
import type { MonthKey } from "./dates";

export function canAddHabit(plan: "FREE" | "PRO", activeHabitCount: number): boolean {
  return activeHabitCount < PLAN_LIMITS[plan].maxHabits;
}

export function maxHabits(plan: "FREE" | "PRO"): number {
  return PLAN_LIMITS[plan].maxHabits;
}

/**
 * Returns true if the user's plan allows viewing `month`.
 * FREE (historyMonths: 0) → current month only.
 * PRO (historyMonths: Infinity) → any past or current month.
 * Future months are always allowed (no logs exist, harmless).
 */
export function canViewMonth(plan: "FREE" | "PRO", month: MonthKey, current: MonthKey): boolean {
  const limit = PLAN_LIMITS[plan].historyMonths;
  if (limit === Infinity) return true;
  const [cy, cm] = current.split("-").map(Number);
  const [my, mm] = month.split("-").map(Number);
  const monthsBack = cy * 12 + cm - (my * 12 + mm);
  // monthsBack < 0 = future month (allowed), >= 0 = past/current (check limit)
  return monthsBack < 0 || monthsBack <= limit;
}
