import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentMonth,
  daysInMonth,
  expandDateRange,
  isFuture,
  isValidMonthKey,
  monthDays,
  monthLabel,
  prevDay,
  todayInTz,
  weeksOf,
} from "./dates";

describe("daysInMonth", () => {
  it("mois standards", () => {
    expect(daysInMonth("2026-07")).toBe(31);
    expect(daysInMonth("2026-04")).toBe(30);
  });
  it("février bissextile et non bissextile", () => {
    expect(daysInMonth("2024-02")).toBe(29);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2100-02")).toBe(28); // divisible par 100, pas par 400
  });
});

describe("monthDays", () => {
  it("juillet 2026 commence un mercredi (comme la vidéo)", () => {
    const days = monthDays("2026-07");
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ date: "2026-07-01", dayNum: 1, dow: "We" });
    expect(days[30].dow).toBe("Fr");
  });
});

describe("weeksOf", () => {
  it("juillet 2026, semaine commençant lundi → 5 groupes comme la vidéo", () => {
    const weeks = weeksOf("2026-07", 1);
    expect(weeks.map((w) => w.label)).toEqual(["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]);
    expect(weeks[0].days.map((d) => d.dayNum)).toEqual([1, 2, 3, 4, 5]); // We→Su
    expect(weeks[4].days.map((d) => d.dayNum)).toEqual([27, 28, 29, 30, 31]); // Mo→Fr
  });
  it("un mois peut produire 6 groupes (août 2026, lundi)", () => {
    const weeks = weeksOf("2026-08", 1);
    expect(weeks.length).toBe(6); // 1er août = samedi, 31 août = lundi seul
    expect(weeks[0].days.map((d) => d.dayNum)).toEqual([1, 2]);
    expect(weeks[5].days.map((d) => d.dayNum)).toEqual([31]);
  });
  it("total des jours = jours du mois, sans doublon", () => {
    for (const m of ["2026-01", "2026-02", "2024-02", "2026-12"]) {
      const all = weeksOf(m, 1).flatMap((w) => w.days.map((d) => d.dayNum));
      expect(all).toHaveLength(daysInMonth(m));
      expect(new Set(all).size).toBe(all.length);
    }
  });
});

describe("fuseaux horaires", () => {
  it("todayInTz retourne un YYYY-MM-DD", () => {
    expect(todayInTz("Africa/Tunis")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("les fuseaux extrêmes peuvent différer d'un jour", () => {
    const kiribati = todayInTz("Pacific/Kiritimati"); // UTC+14
    const samoa = todayInTz("Pacific/Pago_Pago"); // UTC-11
    expect(kiribati >= samoa).toBe(true);
  });
  it("isFuture compare dans le fuseau donné", () => {
    expect(isFuture("2099-01-01", "Africa/Tunis")).toBe(true);
    expect(isFuture("2000-01-01", "Africa/Tunis")).toBe(false);
    expect(isFuture(todayInTz("Africa/Tunis"), "Africa/Tunis")).toBe(false);
  });
});

describe("navigation de mois", () => {
  it("addMonths gère les bords d'année", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-07", -13)).toBe("2025-06");
  });
  it("monthLabel", () => {
    expect(monthLabel("2026-07")).toBe("July 2026");
  });
  it("isValidMonthKey", () => {
    expect(isValidMonthKey("2026-07")).toBe(true);
    expect(isValidMonthKey("2026-13")).toBe(false);
    expect(isValidMonthKey("garbage")).toBe(false);
    expect(isValidMonthKey(null)).toBe(false);
  });
  it("currentMonth = préfixe de todayInTz", () => {
    expect(currentMonth("Africa/Tunis")).toBe(todayInTz("Africa/Tunis").slice(0, 7));
  });
});

describe("prevDay", () => {
  it("gère les bords de mois et d'année", () => {
    expect(prevDay("2026-07-01")).toBe("2026-06-30");
    expect(prevDay("2026-01-01")).toBe("2025-12-31");
    expect(prevDay("2024-03-01")).toBe("2024-02-29");
  });
});

describe("expandDateRange (pause / vacation mode, Sprint 6)", () => {
  it("liste toutes les dates inclusives", () => {
    expect(expandDateRange("2026-07-01", "2026-07-03")).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });

  it("une seule date quand from === to", () => {
    expect(expandDateRange("2026-07-01", "2026-07-01")).toEqual(["2026-07-01"]);
  });

  it("traverse un bord de mois", () => {
    expect(expandDateRange("2026-06-29", "2026-07-01")).toEqual([
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
    ]);
  });
});
