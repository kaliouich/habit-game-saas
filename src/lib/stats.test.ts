import { describe, expect, it } from "vitest";
import {
  bestStreak,
  computeBadges,
  computeLifetimeProgress,
  computeMonthStats,
  computeQuitStreak,
  computeWeeklyRecap,
  currentStreak,
  deriveLoggedDates,
  pctTone,
  rankForLevel,
  type HabitWithLogs,
} from "./stats";

const DAY_MS = 86_400_000;

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

  describe("Streak Shield (Sprint 7)", () => {
    // Un bouclier est fusionné dans `paused` côté data.ts : ces tests
    // verrouillent le comportement attendu vu du calcul de série.
    it("un jour manqué protégé n'interrompt pas la série", () => {
      const logged = new Set(["2026-07-01", "2026-07-02", "2026-07-04"]); // 07-03 manqué
      const shielded = new Set(["2026-07-03"]);
      expect(currentStreak(logged, "2026-07-04")).toBe(1); // sans bouclier
      expect(currentStreak(logged, "2026-07-04", shielded)).toBe(3); // avec
    });

    it("le jour protégé ne compte pas comme un jour réussi", () => {
      const logged = new Set(["2026-07-01", "2026-07-03"]);
      const shielded = new Set(["2026-07-02"]);
      // 2 coches réelles, pas 3 : le bouclier relie sans créditer.
      expect(currentStreak(logged, "2026-07-03", shielded)).toBe(2);
    });

    it("bestStreak tient compte des boucliers", () => {
      const logged = new Set(["2026-07-01", "2026-07-02", "2026-07-04", "2026-07-05"]);
      expect(bestStreak(logged)).toBe(2);
      expect(bestStreak(logged, new Set(["2026-07-03"]))).toBe(4);
    });
  });

  describe("pause / vacation mode (Pro, Sprint 6)", () => {
    it("currentStreak traverse un jour en pause sans casser la série", () => {
      const logged = new Set(["2026-07-01", "2026-07-02", "2026-07-04"]); // 07-03 non coché
      const paused = new Set(["2026-07-03"]); // mais en pause
      expect(currentStreak(logged, "2026-07-04", paused)).toBe(3);
    });

    it("un jour en pause ne compte pas dans la longueur de la série", () => {
      const logged = new Set(["2026-07-01", "2026-07-02"]);
      const paused = new Set(["2026-07-03"]);
      // pas de log le 04 → la série s'arrête là, mais 03 (pause) ne compte pas
      expect(currentStreak(logged, "2026-07-03", paused)).toBe(2);
    });

    it("sans pause déclarée, le même trou casse bien la série (non-régression)", () => {
      const logged = new Set(["2026-07-01", "2026-07-02", "2026-07-04"]);
      expect(currentStreak(logged, "2026-07-04")).toBe(1);
    });

    it("bestStreak traverse une pause de la même façon", () => {
      const logged = new Set(["2026-07-01", "2026-07-02", "2026-07-04", "2026-07-05"]);
      const paused = new Set(["2026-07-03"]);
      expect(bestStreak(logged, paused)).toBe(4);
      expect(bestStreak(logged)).toBe(2); // sans pause déclarée, deux séries de 2
    });
  });
});

describe("badges (Sprint 5)", () => {
  it("perfect week détectée quand toute une semaine calendaire est à 100%", () => {
    const dates = ["06", "07", "08", "09", "10", "11", "12"].map((d) => `2026-07-${d}`);
    const habits = [habit("a", dates)];
    const stats = computeMonthStats({ month: MONTH, habits, moods: [], today: "2026-07-12" });
    expect(computeBadges(stats, habits).some((b) => b.id === "perfect_week")).toBe(true);
  });

  it("pas de perfect week si la semaine est incomplète (jours futurs)", () => {
    const dates = ["06", "07", "08"].map((d) => `2026-07-${d}`);
    const habits = [habit("a", dates)];
    const stats = computeMonthStats({ month: MONTH, habits, moods: [], today: "2026-07-08" });
    expect(computeBadges(stats, habits).some((b) => b.id === "perfect_week")).toBe(false);
  });

  it("badge perfect days à partir de 3 jours parfaits", () => {
    const habits = [habit("a", ["2026-07-01", "2026-07-02", "2026-07-03"])];
    const stats = computeMonthStats({ month: MONTH, habits, moods: [], today: "2026-07-03" });
    const badge = computeBadges(stats, habits).find((b) => b.id === "perfect_days");
    expect(badge?.title).toBe("3 Perfect Days");
    expect(badge?.tier).toBe("free");
  });

  it("pas de badge perfect days sous le seuil de 3", () => {
    const habits = [habit("a", ["2026-07-01", "2026-07-02"])];
    const stats = computeMonthStats({ month: MONTH, habits, moods: [], today: "2026-07-02" });
    expect(computeBadges(stats, habits).some((b) => b.id === "perfect_days")).toBe(false);
  });

  it("mois parfait quand goalTotal === completedTotal", () => {
    const habits = [habit("a", ["2026-07-01"], { goal: 1 })];
    const stats = computeMonthStats({ month: MONTH, habits, moods: [], today: "2026-07-01" });
    const badge = computeBadges(stats, habits).find((b) => b.id === "full_month");
    expect(badge).toBeDefined();
    expect(badge?.tier).toBe("pro");
  });

  it("badge streak au palier 7 jours (free), pas en dessous", () => {
    const sevenDays = ["01", "02", "03", "04", "05", "06", "07"].map((d) => `2026-07-${d}`);
    const habitsA = [habit("a", sevenDays)];
    const stats7 = computeMonthStats({ month: MONTH, habits: habitsA, moods: [], today: "2026-07-07" });
    const badge = computeBadges(stats7, habitsA).find((b) => b.id === "streak_a");
    expect(badge?.tier).toBe("free");

    const sixDays = sevenDays.slice(0, 6);
    const habitsB = [habit("b", sixDays)];
    const stats6 = computeMonthStats({ month: MONTH, habits: habitsB, moods: [], today: "2026-07-06" });
    expect(computeBadges(stats6, habitsB).some((b) => b.id === "streak_b")).toBe(false);
  });

  it("badge streak au palier 30 jours passe en tier pro", () => {
    const days30: string[] = [];
    for (let d = 1; d <= 30; d++) days30.push(`2026-06-${String(d).padStart(2, "0")}`);
    const habits = [habit("a", days30)];
    const stats = computeMonthStats({ month: "2026-06", habits, moods: [], today: "2026-06-30" });
    const badge = computeBadges(stats, habits).find((b) => b.id === "streak_a");
    expect(badge?.tier).toBe("pro");
    expect(badge?.title).toContain("30-Day");
  });

  it("badge century à 100 completions lifetime, toutes habitudes confondues", () => {
    const a = Array.from({ length: 60 }, (_, i) => `2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, "0")}`);
    const b = Array.from({ length: 45 }, (_, i) => `2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, "0")}`);
    const habits = [habit("a", a), habit("b", b)];
    const stats = computeMonthStats({ month: MONTH, habits, moods: [], today: "2026-07-31" });
    expect(computeBadges(stats, habits).some((x) => x.id === "century")).toBe(true);
  });

  it("pas de badge century sous 100 completions lifetime", () => {
    const habits = [habit("a", ["2026-07-01", "2026-07-02"])];
    const stats = computeMonthStats({ month: MONTH, habits, moods: [], today: "2026-07-02" });
    expect(computeBadges(stats, habits).some((x) => x.id === "century")).toBe(false);
  });
});

describe("pctTone — Midnight rebuild (couleur sémantique par score)", () => {
  it("sous 40% : danger", () => {
    expect(pctTone(0)).toBe("danger");
    expect(pctTone(0.39)).toBe("danger");
  });

  it("entre 40% et 75% (exclu) : warning", () => {
    expect(pctTone(0.4)).toBe("warning");
    expect(pctTone(0.74)).toBe("warning");
  });

  it("75% et plus : success", () => {
    expect(pctTone(0.75)).toBe("success");
    expect(pctTone(1)).toBe("success");
  });
});

describe("rankForLevel (Sprint 7)", () => {
  it("niveau 1 → Recruit, et chaque palier promeut", () => {
    expect(rankForLevel(1).key).toBe("recruit");
    expect(rankForLevel(2).key).toBe("recruit"); // pas encore Squire (min 3)
    expect(rankForLevel(3).key).toBe("squire");
    expect(rankForLevel(6).key).toBe("warrior");
    expect(rankForLevel(40).key).toBe("legend");
  });

  it("au-delà du dernier palier, reste Legend (pas de rang manquant)", () => {
    expect(rankForLevel(999).key).toBe("legend");
  });
});

describe("computeLifetimeProgress", () => {
  it("0 completions → niveau 1, 0 XP, rang Recruit", () => {
    const progress = computeLifetimeProgress([habit("a", [])]);
    expect(progress).toMatchObject({ xp: 0, level: 1, xpIntoLevel: 0, xpForNextLevel: 500 });
    expect(progress.rank.key).toBe("recruit");
    expect(progress.nextRank?.key).toBe("squire");
  });

  it("XP additionne les logs de toutes les habitudes", () => {
    const habits = [habit("a", ["2026-07-01", "2026-07-02"]), habit("b", ["2026-07-01"])];
    // 3 ticks lifetime × 10 XP = 30 XP
    expect(computeLifetimeProgress(habits).xp).toBe(30);
  });

  it("passe au niveau 2 à 500 XP (50 ticks)", () => {
    const dates = Array.from({ length: 50 }, (_, i) => `2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, "0")}`);
    const progress = computeLifetimeProgress([habit("a", dates)]);
    expect(progress.xp).toBe(500);
    expect(progress.level).toBe(2);
    expect(progress.xpIntoLevel).toBe(0);
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

describe("deriveLoggedDates — Phase 1 roadmap (socle quantifié)", () => {
  it("targetValue null (TIMES) : tout log (value=1) compte, rétrocompatible", () => {
    const dates = deriveLoggedDates(
      [
        { date: "2026-07-01", value: 1 },
        { date: "2026-07-02", value: 1 },
      ],
      null,
    );
    expect(dates).toEqual(new Set(["2026-07-01", "2026-07-02"]));
  });

  it("un jour sous la cible ne compte pas (progression partielle)", () => {
    const dates = deriveLoggedDates(
      [
        { date: "2026-07-01", value: 6250 },
        { date: "2026-07-02", value: 10000 },
      ],
      10000,
    );
    expect(dates.has("2026-07-01")).toBe(false);
    expect(dates.has("2026-07-02")).toBe(true);
  });

  it("valeur exactement égale à la cible compte (>=, pas >)", () => {
    const dates = deriveLoggedDates([{ date: "2026-07-01", value: 30 }], 30);
    expect(dates.has("2026-07-01")).toBe(true);
  });
});

describe("computeQuitStreak — Phase 2 roadmap (compteur d'arrêt)", () => {
  const now = new Date("2026-07-15T00:00:00Z");

  it("aucune rechute : la série en cours est aussi le record", () => {
    const createdAt = new Date(now.getTime() - 10 * DAY_MS);
    const result = computeQuitStreak(createdAt, [], now);
    expect(result.currentMs).toBe(10 * DAY_MS);
    expect(result.bestMs).toBe(10 * DAY_MS);
    expect(result.relapseCount).toBe(0);
  });

  it("le record est un intervalle passé plus long que la série en cours", () => {
    const createdAt = new Date(now.getTime() - 40 * DAY_MS);
    const relapse = new Date(now.getTime() - 8 * DAY_MS); // 32j tenus, puis rechute, 8j en cours
    const result = computeQuitStreak(createdAt, [relapse], now);
    expect(result.currentMs).toBe(8 * DAY_MS);
    expect(result.bestMs).toBe(32 * DAY_MS);
    expect(result.relapseCount).toBe(1);
  });

  it("la série en cours dépasse déjà tous les intervalles passés : elle devient le record", () => {
    const createdAt = new Date(now.getTime() - 40 * DAY_MS);
    const relapse = new Date(now.getTime() - 35 * DAY_MS); // 5j tenus, puis 35j en cours
    const result = computeQuitStreak(createdAt, [relapse], now);
    expect(result.currentMs).toBe(35 * DAY_MS);
    expect(result.bestMs).toBe(35 * DAY_MS);
  });

  it("l'ordre des rechutes en entrée n'a pas d'importance (triées en interne)", () => {
    const createdAt = new Date(now.getTime() - 30 * DAY_MS);
    const r1 = new Date(now.getTime() - 20 * DAY_MS);
    const r2 = new Date(now.getTime() - 25 * DAY_MS);
    const sorted = computeQuitStreak(createdAt, [r1, r2], now);
    const reversed = computeQuitStreak(createdAt, [r2, r1], now);
    expect(reversed).toEqual(sorted);
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
