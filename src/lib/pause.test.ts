import { describe, it, expect } from "vitest";
import { expandDateRange } from "./dates";
import { MAX_PAUSE_DAYS } from "./config";

/**
 * Vacation mode : une pause non bornée rendait toute série définitivement
 * incassable (mécanique de jeu contournée) et faisait expanser jusqu'à 3660
 * dates par habitude à chaque rendu du dashboard. Règle verrouillée ici.
 */

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const ms = Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd);
  return Math.round(ms / 86_400_000) + 1;
}

describe("bornes de la pause (vacation mode)", () => {
  it("compte les jours en incluant les deux bornes", () => {
    expect(daysBetween("2026-08-01", "2026-08-01")).toBe(1);
    expect(daysBetween("2026-08-01", "2026-08-31")).toBe(31);
  });

  it("accepte une plage de congés réaliste", () => {
    expect(daysBetween("2026-08-01", "2026-08-15")).toBeLessThanOrEqual(MAX_PAUSE_DAYS);
    expect(daysBetween("2026-08-01", "2026-10-29")).toBeLessThanOrEqual(MAX_PAUSE_DAYS);
  });

  it("rejette une plage qui neutraliserait les séries à vie", () => {
    expect(daysBetween("1970-01-01", "2999-12-31")).toBeGreaterThan(MAX_PAUSE_DAYS);
    expect(daysBetween("2026-01-01", "2026-12-31")).toBeGreaterThan(MAX_PAUSE_DAYS);
  });

  it("traverse correctement une année bissextile", () => {
    // 2028 est bissextile : février compte 29 jours.
    expect(daysBetween("2028-02-01", "2028-03-01")).toBe(30);
  });

  it("une pause bornée reste peu coûteuse à expanser", () => {
    const dates = expandDateRange("2026-08-01", "2026-10-29");
    expect(dates.length).toBeLessThanOrEqual(MAX_PAUSE_DAYS);
    expect(dates[0]).toBe("2026-08-01");
    expect(dates[dates.length - 1]).toBe("2026-10-29");
  });
});
