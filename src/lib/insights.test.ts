import { describe, expect, it } from "vitest";
import { computeHabitInsights } from "./insights";
import { expandDateRange, type ISODate } from "./dates";

const TODAY: ISODate = "2026-07-22"; // mercredi

describe("computeHabitInsights", () => {
  it("heatmap : 53 colonnes de 7, terminée sur le samedi de la semaine courante", () => {
    const r = computeHabitInsights({ logged: new Set(), paused: new Set(), createdOn: "2026-01-01", today: TODAY });
    expect(r.heatmap).toHaveLength(53);
    expect(r.heatmap.every((c) => c.length === 7)).toBe(true);
    const last = r.heatmap[52];
    expect(last[0].date).toBe("2026-07-19"); // dimanche
    expect(last[6].date).toBe("2026-07-25"); // samedi
    expect(last[3]).toMatchObject({ date: TODAY, state: "future" }); // aujourd'hui non coché
    expect(last[4].state).toBe("future");
  });

  it("classe done / missed / off / paused / before", () => {
    const logged = new Set<ISODate>(["2026-07-20"]);
    const r = computeHabitInsights({
      logged,
      paused: new Set(["2026-07-17"]),
      scheduleDays: [1, 3, 5], // lun mer ven
      createdOn: "2026-07-10",
      today: TODAY,
    });
    const flat = new Map(r.heatmap.flat().map((c) => [c.date, c.state]));
    expect(flat.get("2026-07-20")).toBe("done");
    expect(flat.get("2026-07-15")).toBe("missed"); // mercredi prévu, non coché
    expect(flat.get("2026-07-16")).toBe("off"); // jeudi non prévu
    expect(flat.get("2026-07-17")).toBe("paused");
    expect(flat.get("2026-07-07")).toBe("off"); // mardi, non prévu
    expect(flat.get("2026-07-08")).toBe("before"); // mercredi prévu mais avant la création
  });

  it("taux 30 jours : seulement les jours prévus, aujourd'hui non coché ignoré", () => {
    const logged = new Set(expandDateRange("2026-07-13", "2026-07-21")); // 9 jours, tous cochés
    const r = computeHabitInsights({ logged, paused: new Set(), createdOn: "2026-07-13", today: TODAY });
    expect(r.rate30).toBe(1);
    expect(r.currentStreak).toBe(9);
  });

  it("taux par jour de semaine : détecte le jour faible", () => {
    // Quotidien depuis le 6 juillet, mais jamais le samedi.
    const logged = new Set<ISODate>();
    for (const d of expandDateRange("2026-07-06", "2026-07-21")) {
      if (new Date(`${d}T00:00:00Z`).getUTCDay() !== 6) logged.add(d);
    }
    const r = computeHabitInsights({ logged, paused: new Set(), createdOn: "2026-07-06", today: TODAY });
    expect(r.weekdayRates[6]).toBe(0);
    expect(r.weekdayRates[1]).toBe(1);
  });

  it("null quand aucun jour n'était prévu (habitude toute neuve)", () => {
    const r = computeHabitInsights({ logged: new Set(), paused: new Set(), createdOn: TODAY, today: TODAY });
    expect(r.rate30).toBeNull();
    expect(r.rate90).toBeNull();
    expect(r.strength).toBe(0);
  });
});
