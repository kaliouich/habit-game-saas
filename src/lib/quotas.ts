import { PLAN_LIMITS } from "./config";

export function canAddHabit(plan: "FREE" | "PRO", activeHabitCount: number): boolean {
  return activeHabitCount < PLAN_LIMITS[plan].maxHabits;
}

export function maxHabits(plan: "FREE" | "PRO"): number {
  return PLAN_LIMITS[plan].maxHabits;
}
