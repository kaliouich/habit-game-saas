import { describe, expect, it } from "vitest";
import { habitStrength } from "./stats";
import { expandDateRange, type ISODate } from "./dates";

const set = (from: ISODate, to: ISODate) => new Set(expandDateRange(from, to));

describe("habitStrength", () => {
  it("vaut 0 sans aucune coche", () => {
    expect(habitStrength(new Set(), "2026-07-20")).toBe(0);
  });

  it("monte avec la régularité et reste sous 1", () => {
    const s30 = habitStrength(set("2026-06-21", "2026-07-20"), "2026-07-20");
    const s90 = habitStrength(set("2026-04-22", "2026-07-20"), "2026-07-20");
    expect(s30).toBeGreaterThan(0.7);
    expect(s90).toBeGreaterThan(s30);
    expect(s90).toBeLessThan(1);
  });

  it("pardonne un jour raté après une longue régularité", () => {
    const logged = set("2026-04-22", "2026-07-20");
    logged.delete("2026-07-19");
    const s = habitStrength(logged, "2026-07-20");
    expect(s).toBeGreaterThan(0.9);
  });

  it("ne pénalise pas aujourd'hui tant qu'il n'est pas coché", () => {
    const logged = set("2026-06-21", "2026-07-19");
    const before = habitStrength(logged, "2026-07-19");
    expect(habitStrength(logged, "2026-07-20")).toBeLessThanOrEqual(before);
    expect(habitStrength(logged, "2026-07-20")).toBeCloseTo(before, 10);
  });

  it("baisse quand on arrête", () => {
    const logged = set("2026-05-01", "2026-06-01");
    const atStop = habitStrength(logged, "2026-06-01");
    const later = habitStrength(logged, "2026-06-29");
    expect(later).toBeLessThan(atStop / 2);
  });

  it("ignore les jours de repos du planning et les pauses", () => {
    // Lun/Mer/Ven cochés pendant 8 semaines, jamais de jour raté prévu.
    const logged = new Set<ISODate>();
    for (const d of expandDateRange("2026-05-25", "2026-07-19")) {
      const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
      if ([1, 3, 5].includes(wd)) logged.add(d);
    }
    const sched = habitStrength(logged, "2026-07-20", new Set(), [1, 3, 5]);
    const everyDay = habitStrength(logged, "2026-07-20");
    expect(sched).toBeGreaterThan(0.85);
    expect(sched).toBeGreaterThan(everyDay);

    const gap = expandDateRange("2026-06-01", "2026-06-14");
    const full = set("2026-05-01", "2026-05-31");
    const noPause = habitStrength(full, "2026-06-14");
    const paused = habitStrength(full, "2026-06-14", new Set(gap));
    expect(paused).toBeGreaterThan(noPause);
  });
});
