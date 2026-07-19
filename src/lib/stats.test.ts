import { describe, expect, it } from "vitest";
import { bestStreak, computeMonthStats, currentStreak, type HabitWithLogs } from "./stats";

function habit(id: string, dates: string[], overrides: Partial<HabitWithLogs> = {}): HabitWithLogs {
  return {
    id,
    name: id,
    emoji: null,
    type: "BUILD",
    goal: null,
    position: 0,
    loggedDates: new Set(dates),
    ...overrides,
  };
}

const MONTH = "2026-07"; // 31 jours, commence mercredi (le mois de la vidéo)

describe("computeMonthStats — formules V4..V9", () => {
  const habits = [
    habit("a", ["2026-07-01", "2026-07-02", "2026-07-03"]),
    habit("b", ["2026-07-01", "2026-07-02"]),
    habit("c", ["2026-07-01"]),
  ];
  const stats = computeMonthStats({ month: MONTH, habits, moods: [], today: "2026-07-03" });

  it("dailyProgress : % du jour, null pour le futur (V4)", () => {
    expect(stats.dailyProgress[0]).toBe(1); // 3/3 le 1er
    expect(stats.dailyProgress[1]).toBeCloseTo(2 / 3); // le 2
    expect(stats.dailyProgress[2]).toBeCloseTo(1 / 3); // le 3
    expect(stats.dailyProgress[3]).toBeNull(); // le 4 est futur
    expect(stats.dailyProgress[30]).toBeNull();
  });

  it("weeklyProgress : moyenne des jours écoulés (V5)", () => {
    // Week 1 = 1..5, jours écoulés = 1,2,3 → (1 + 2/3 + 1/3)/3
    expect(stats.weeklyProgress[0].pct).toBeCloseTo(2 / 3);
    expect(stats.weeklyProgress[1].pct).toBeNull(); // Week 2 entièrement future
    expect(stats.weeklyProgress).toHaveLength(5);
  });

  it("cartes Goal/Completed/Left (V6) et donut (V7)", () => {
    expect(stats.goalTotal).toBe(93); // 3 habitudes × 31 (goal auto)
    expect(stats.completedTotal).toBe(6);
    expect(stats.leftTotal).toBe(87);
    expect(stats.overallPct).toBeCloseTo(6 / 93);
  });

  it("analysis par habitude (V8)", () => {
    const a = stats.analysis.find((x) => x.habitId === "a")!;
    expect(a).toMatchObject({ goal: 31, actual: 3, left: 28 });
    expect(a.pct).toBeCloseTo(3 / 31);
  });

  it("top10 trié par % décroissant (V9)", () => {
    expect(stats.top10.map((x) => x.habitId)).toEqual(["a", "b", "c"]);
  });

  it("perfect day détecté (B5)", () => {
    expect(stats.perfectDays.has("2026-07-01")).toBe(true);
    expect(stats.perfectDays.has("2026-07-02")).toBe(false);
  });
});

describe("goal personnalisé et bornes", () => {
  it("goal explicite respecté, pct plafonné à 1", () => {
    const h = habit("x", ["2026-07-01", "2026-07-02", "2026-07-03"], { goal: 2 });
    const stats = computeMonthStats({ month: MONTH, habits: [h], moods: [], today: "2026-07-03" });
    expect(stats.analysis[0]).toMatchObject({ goal: 2, actual: 3, left: 0 });
    expect(stats.analysis[0].pct).toBe(1);
  });

  it("aucune habitude → pas de division par zéro", () => {
    const stats = computeMonthStats({ month: MONTH, habits: [], moods: [], today: "2026-07-03" });
    expect(stats.overallPct).toBe(0);
    expect(stats.dailyProgress[0]).toBeNull();
  });

  it("les logs hors mois ne comptent pas dans actual", () => {
    const h = habit("x", ["2026-06-30", "2026-07-01", "2026-08-01"]);
    const stats = computeMonthStats({ month: MONTH, habits: [h], moods: [], today: "2026-07-31" });
    expect(stats.analysis[0].actual).toBe(1);
  });
});

describe("streaks (B1)", () => {
  it("streak courant depuis aujourd'hui", () => {
    const logged = new Set(["2026-07-01", "2026-07-02", "2026-07-03"]);
    expect(currentStreak(logged, "2026-07-03")).toBe(3);
  });
  it("aujourd'hui pas encore coché → la série d'hier tient toujours", () => {
    const logged = new Set(["2026-07-01", "2026-07-02"]);
    expect(currentStreak(logged, "2026-07-03")).toBe(2);
  });
  it("trou avant-hier → série cassée", () => {
    const logged = new Set(["2026-07-01"]);
    expect(currentStreak(logged, "2026-07-03")).toBe(0);
  });
  it("traverse les bords de mois", () => {
    const logged = new Set(["2026-06-29", "2026-06-30", "2026-07-01"]);
    expect(currentStreak(logged, "2026-07-01")).toBe(3);
  });
  it("bestStreak trouve le record historique", () => {
    const logged = new Set([
      "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", // 4
      "2026-07-10", "2026-07-11", // 2
    ]);
    expect(bestStreak(logged)).toBe(4);
    expect(bestStreak(new Set())).toBe(0);
  });
});

describe("mood (V10)", () => {
  it("map par date, hors mois exclu", () => {
    const stats = computeMonthStats({
      month: MONTH,
      habits: [],
      moods: [
        { date: "2026-07-01", value: 4 },
        { date: "2026-06-30", value: 1 },
      ],
      today: "2026-07-03",
    });
    expect(stats.moodByDate.get("2026-07-01")).toBe(4);
    expect(stats.moodByDate.has("2026-06-30")).toBe(false);
  });
});
