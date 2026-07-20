import { describe, expect, it } from "vitest";
import {
  bestStreak,
  computeBadges,
  computeMonthStats,
  computeWeeklyRecap,
  currentStreak,
  type HabitWithLogs,
} from "./stats";

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

describe("badges (Sprint 5)", () => {
  it("perfect week détectée quand toute une semaine calendaire est à 100%", () => {
    const dates = ["06", "07", "08", "09", "10", "11", "12"].map((d) => `2026-07-${d}`);
    const stats = computeMonthStats({ month: MONTH, habits: [habit("a", dates)], moods: [], today: "2026-07-12" });
    expect(computeBadges(stats).some((b) => b.id === "perfect_week")).toBe(true);
  });

  it("pas de perfect week si la semaine est incomplète (jours futurs)", () => {
    const dates = ["06", "07", "08"].map((d) => `2026-07-${d}`);
    const stats = computeMonthStats({ month: MONTH, habits: [habit("a", dates)], moods: [], today: "2026-07-08" });
    expect(computeBadges(stats).some((b) => b.id === "perfect_week")).toBe(false);
  });

  it("badge perfect days à partir de 3 jours parfaits", () => {
    const h = habit("a", ["2026-07-01", "2026-07-02", "2026-07-03"]);
    const stats = computeMonthStats({ month: MONTH, habits: [h], moods: [], today: "2026-07-03" });
    const badge = computeBadges(stats).find((b) => b.id === "perfect_days");
    expect(badge?.title).toBe("3 Perfect Days");
  });

  it("pas de badge perfect days sous le seuil de 3", () => {
    const h = habit("a", ["2026-07-01", "2026-07-02"]);
    const stats = computeMonthStats({ month: MONTH, habits: [h], moods: [], today: "2026-07-02" });
    expect(computeBadges(stats).some((b) => b.id === "perfect_days")).toBe(false);
  });

  it("mois parfait quand goalTotal === completedTotal", () => {
    const h = habit("a", ["2026-07-01"], { goal: 1 });
    const stats = computeMonthStats({ month: MONTH, habits: [h], moods: [], today: "2026-07-01" });
    expect(computeBadges(stats).some((b) => b.id === "full_month")).toBe(true);
  });

  it("badge streak au palier 7 jours, pas en dessous", () => {
    const sevenDays = ["01", "02", "03", "04", "05", "06", "07"].map((d) => `2026-07-${d}`);
    const stats7 = computeMonthStats({ month: MONTH, habits: [habit("a", sevenDays)], moods: [], today: "2026-07-07" });
    expect(computeBadges(stats7).some((b) => b.id === "streak_a")).toBe(true);

    const sixDays = sevenDays.slice(0, 6);
    const stats6 = computeMonthStats({ month: MONTH, habits: [habit("b", sixDays)], moods: [], today: "2026-07-06" });
    expect(computeBadges(stats6).some((b) => b.id === "streak_b")).toBe(false);
  });
});

describe("computeWeeklyRecap (Sprint 5 — récap email)", () => {
  it("compte les 7 derniers jours glissants, peut chevaucher deux mois", () => {
    const dates = ["2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02"];
    const h = habit("a", dates);
    const recap = computeWeeklyRecap([h], "2026-07-03");
    // Fenêtre = 06-27..07-03 ; seuls 06-29,06-30,07-01,07-02 sont cochés → 4
    expect(recap.completed).toBe(4);
    expect(recap.goal).toBe(7);
    expect(recap.pct).toBeCloseTo(4 / 7);
    expect(recap.daysActive).toBe(4);
  });

  it("bestStreakHabit reflète le streak courant le plus long", () => {
    const a = habit("a", ["2026-07-01", "2026-07-02", "2026-07-03"]);
    const b = habit("b", ["2026-07-03"]);
    const recap = computeWeeklyRecap([a, b], "2026-07-03");
    expect(recap.bestStreakHabit).toMatchObject({ name: "a", streak: 3 });
  });

  it("aucune habitude → tout à zéro, pas de division par zéro", () => {
    const recap = computeWeeklyRecap([], "2026-07-03");
    expect(recap).toMatchObject({ completed: 0, goal: 0, pct: 0, daysActive: 0, bestStreakHabit: null });
  });

  it("aucun log récent → bestStreakHabit null", () => {
    const h = habit("a", ["2026-06-01"]);
    const recap = computeWeeklyRecap([h], "2026-07-03");
    expect(recap.bestStreakHabit).toBeNull();
    expect(recap.completed).toBe(0);
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
