import { describe, expect, it } from "vitest";
import { countDueDays, isDueOn, normalizeScheduleDays } from "./dates";
import { bestStreak, computeMonthStats, computeWeeklyRecap, currentStreak, type HabitWithLogs } from "./stats";

// Juillet 2026 : le 1er est un mercredi. Lun/Mer/Ven = 1,3,5.
const MWF = [1, 3, 5];

describe("isDueOn / countDueDays / normalizeScheduleDays", () => {
  it("vide ou absent = tous les jours", () => {
    expect(isDueOn(undefined, "2026-07-04")).toBe(true);
    expect(isDueOn([], "2026-07-04")).toBe(true);
  });
  it("respecte les jours de la semaine (1er juillet 2026 = mercredi)", () => {
    expect(isDueOn(MWF, "2026-07-01")).toBe(true); // mer
    expect(isDueOn(MWF, "2026-07-02")).toBe(false); // jeu
    expect(isDueOn(MWF, "2026-07-06")).toBe(true); // lun
    expect(isDueOn([0], "2026-07-05")).toBe(true); // dimanche
  });
  it("compte les jours prévus d'un mois", () => {
    const july = Array.from({ length: 31 }, (_, i) => `2026-07-${String(i + 1).padStart(2, "0")}`);
    expect(countDueDays(MWF, july)).toBe(14); // 5 mercredis + 5 vendredis + 4 lundis
    expect(countDueDays([], july)).toBe(31);
  });
  it("normalise : unique, trié, borné ; 7 jours = tous = []", () => {
    expect(normalizeScheduleDays([5, 1, 1, 3, 9, -1, 2.5])).toEqual([1, 3, 5]);
    expect(normalizeScheduleDays([0, 1, 2, 3, 4, 5, 6])).toEqual([]);
    expect(normalizeScheduleDays(undefined)).toEqual([]);
  });
});

describe("séries avec jours prévus", () => {
  // Lun 6, Mer 8, Ven 10 cochés ; mar/jeu non prévus ne cassent rien.
  const logged = new Set(["2026-07-06", "2026-07-08", "2026-07-10"]);
  it("jours de repos traversés sans casser ni compter", () => {
    expect(currentStreak(logged, "2026-07-10", new Set(), MWF)).toBe(3);
  });
  it("le week-end (non prévu) après vendredi ne casse pas la série du lundi suivant", () => {
    expect(currentStreak(logged, "2026-07-12", new Set(), MWF)).toBe(3); // dimanche, vendredi coché
  });
  it("un jour prévu manqué casse bien la série", () => {
    const missed = new Set(["2026-07-06", "2026-07-10"]); // mer 8 manqué
    expect(currentStreak(missed, "2026-07-10", new Set(), MWF)).toBe(1);
  });
  it("sans planning, mar/jeu non cochés cassent (comportement historique)", () => {
    expect(currentStreak(logged, "2026-07-10")).toBe(1);
  });
  it("bestStreak : une série qui commence après des jours de repos est bien comptée", () => {
    // Premier log un lundi, précédé de dim/sam non prévus pour [1] seulement.
    expect(bestStreak(new Set(["2026-07-06", "2026-07-13"]), new Set(), [1])).toBe(2);
    expect(bestStreak(logged, new Set(), MWF)).toBe(3);
  });
});

function habit(over: Partial<HabitWithLogs> & { id: string }): HabitWithLogs {
  return { name: over.id, emoji: null, type: "BUILD", goal: null, position: 0, loggedDates: new Set(), ...over };
}

describe("progression et objectif avec jours prévus", () => {
  it("le dénominateur de la progression quotidienne ne compte que les habitudes prévues", () => {
    const stats = computeMonthStats({
      month: "2026-07",
      today: "2026-07-31",
      moods: [],
      habits: [
        habit({ id: "daily", loggedDates: new Set(["2026-07-02"]) }), // jeudi
        habit({ id: "mwf", scheduleDays: MWF, loggedDates: new Set() }),
      ],
    });
    // Jeudi 2 : seule "daily" est prévue et elle est cochée → 100 %.
    expect(stats.dailyProgress[1]).toBe(1);
    expect(stats.perfectDays.has("2026-07-02")).toBe(true);
    // Mercredi 1 : les deux sont prévues, aucune cochée → 0 %.
    expect(stats.dailyProgress[0]).toBe(0);
  });
  it("l'objectif mensuel par défaut = nombre de jours prévus", () => {
    const stats = computeMonthStats({
      month: "2026-07",
      today: "2026-07-31",
      moods: [],
      habits: [habit({ id: "mwf", scheduleDays: MWF })],
    });
    expect(stats.analysis[0].goal).toBe(14);
  });
  it("un objectif explicite reste prioritaire", () => {
    const stats = computeMonthStats({ month: "2026-07", today: "2026-07-31", moods: [], habits: [habit({ id: "x", scheduleDays: MWF, goal: 8 })] });
    expect(stats.analysis[0].goal).toBe(8);
  });
});

describe("récap hebdomadaire", () => {
  it("l'objectif ne compte que les jours prévus des 7 derniers jours", () => {
    // 7 jours se terminant le dimanche 12 juillet : lun 6, mer 8, ven 10 = 3 jours prévus.
    const r = computeWeeklyRecap([habit({ id: "mwf", scheduleDays: MWF, loggedDates: new Set(["2026-07-06", "2026-07-08"]) })], "2026-07-12");
    expect(r.goal).toBe(3);
    expect(r.completed).toBe(2);
  });
});
