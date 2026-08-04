import { describe, expect, it } from "vitest";
import { computeReport, type ReportHabit } from "./report";

function habit(id: string, dates: string[], paused: string[] = []): ReportHabit {
  return {
    id,
    name: id,
    emoji: null,
    loggedDates: new Set(dates),
    pausedDates: new Set(paused),
  };
}

describe("computeReport", () => {
  it("couvre une plage qui traverse deux mois", () => {
    const r = computeReport({
      habits: [habit("a", ["2026-06-29", "2026-07-01"])],
      from: "2026-06-28",
      to: "2026-07-02",
      moods: [],
    });
    expect(r.days).toHaveLength(5); // 28,29,30,01,02
    expect(r.byHabit[0].done).toBe(2);
    expect(r.byHabit[0].goal).toBe(5);
    expect(r.overallPct).toBeCloseTo(2 / 5);
  });

  it("ne compte que les jours dans la plage, pas tout l'historique", () => {
    const r = computeReport({
      habits: [habit("a", ["2026-01-01", "2026-07-01", "2026-07-02"])],
      from: "2026-07-01",
      to: "2026-07-03",
      moods: [],
    });
    expect(r.byHabit[0].done).toBe(2); // le log de janvier est hors plage
  });

  it("jour parfait = toutes les habitudes cochées", () => {
    const r = computeReport({
      habits: [habit("a", ["2026-07-01", "2026-07-02"]), habit("b", ["2026-07-01"])],
      from: "2026-07-01",
      to: "2026-07-02",
      moods: [],
    });
    expect(r.perfectDays).toBe(1);
    expect(r.days[0].pct).toBe(1);
    expect(r.days[1].pct).toBe(0.5);
  });

  it("la série courante est celle de la FIN de période, pas d'aujourd'hui", () => {
    // Un rapport sur un mois passé doit décrire ce mois-là.
    const r = computeReport({
      habits: [habit("a", ["2026-07-29", "2026-07-30", "2026-07-31"])],
      from: "2026-07-01",
      to: "2026-07-31",
      moods: [],
    });
    expect(r.byHabit[0].currentStreak).toBe(3);
  });

  it("un jour en pause relie la série sans la créditer", () => {
    const r = computeReport({
      habits: [habit("a", ["2026-07-01", "2026-07-03"], ["2026-07-02"])],
      from: "2026-07-01",
      to: "2026-07-03",
      moods: [],
    });
    expect(r.byHabit[0].bestStreak).toBe(2); // 2 coches, pas 3
    expect(r.byHabit[0].done).toBe(2);
  });

  it("agrège par jour de semaine pour révéler le jour faible", () => {
    // 2026-07-04 est un samedi ; on y échoue systématiquement.
    const r = computeReport({
      habits: [habit("a", ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-05"])],
      from: "2026-07-01",
      to: "2026-07-05",
      moods: [],
    });
    const sat = r.byWeekday.find((w) => w.label === "Sat");
    expect(sat?.pct).toBe(0);
    const wed = r.byWeekday.find((w) => w.label === "Wed");
    expect(wed?.pct).toBe(1);
  });

  it("moyenne d'humeur bornée à la plage", () => {
    const r = computeReport({
      habits: [],
      from: "2026-07-01",
      to: "2026-07-02",
      moods: [
        { date: "2026-06-30", value: 1 }, // hors plage
        { date: "2026-07-01", value: 4 },
        { date: "2026-07-02", value: 2 },
      ],
    });
    expect(r.avgMood).toBe(3);
  });

  it("aucune habitude → pas de division par zéro", () => {
    const r = computeReport({ habits: [], from: "2026-07-01", to: "2026-07-03", moods: [] });
    expect(r.overallPct).toBe(0);
    expect(r.perfectDays).toBe(0);
    expect(r.days.every((d) => d.pct === 0)).toBe(true);
  });
});
