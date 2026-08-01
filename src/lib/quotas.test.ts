import { describe, it, expect } from "vitest";
import { canViewMonth, canAddHabit, maxHabits } from "./quotas";

describe("canViewMonth", () => {
  const current = "2026-07";

  it("FREE user can view current month", () => {
    expect(canViewMonth("FREE", "2026-07", current)).toBe(true);
  });

  it("FREE user is blocked from 1 month ago", () => {
    expect(canViewMonth("FREE", "2026-06", current)).toBe(false);
  });

  it("FREE user is blocked from 6 months ago", () => {
    expect(canViewMonth("FREE", "2026-01", current)).toBe(false);
  });

  it("FREE user can view a future month (no data, harmless)", () => {
    expect(canViewMonth("FREE", "2026-08", current)).toBe(true);
  });

  it("PRO user can view any past month", () => {
    expect(canViewMonth("PRO", "2020-01", current)).toBe(true);
  });

  it("PRO user can view current month", () => {
    expect(canViewMonth("PRO", "2026-07", current)).toBe(true);
  });

  it("PRO user can view future month", () => {
    expect(canViewMonth("PRO", "2027-01", current)).toBe(true);
  });

  it("handles year boundary correctly (Dec → Jan)", () => {
    expect(canViewMonth("FREE", "2025-12", "2026-01")).toBe(false);
    expect(canViewMonth("FREE", "2026-01", "2026-01")).toBe(true);
  });
});

describe("canAddHabit", () => {
  it("FREE user blocked at 5 habits", () => {
    expect(canAddHabit("FREE", 5)).toBe(false);
  });

  it("FREE user allowed below limit", () => {
    expect(canAddHabit("FREE", 4)).toBe(true);
  });

  it("PRO user has no habit limit", () => {
    expect(canAddHabit("PRO", 23)).toBe(true);
    expect(canAddHabit("PRO", 24)).toBe(true);
    expect(canAddHabit("PRO", 1000)).toBe(true);
  });
});

describe("maxHabits", () => {
  it("returns correct limits per plan", () => {
    expect(maxHabits("FREE")).toBe(5);
    expect(maxHabits("PRO")).toBe(Infinity);
  });
});
