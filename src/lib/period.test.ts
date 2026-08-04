import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./period";

const TODAY = "2026-07-24";

describe("resolvePeriod", () => {
  it("par défaut : mois courant jusqu'à aujourd'hui", () => {
    const p = resolvePeriod({}, TODAY, "PRO");
    expect(p).toMatchObject({ from: "2026-07-01", to: TODAY, key: "month", clamped: false });
  });

  it("Pro : 30 et 90 jours glissants, bornes incluses", () => {
    expect(resolvePeriod({ period: "30d" }, TODAY, "PRO").from).toBe("2026-06-25"); // 30 jours au total
    expect(resolvePeriod({ period: "90d" }, TODAY, "PRO").from).toBe("2026-04-26");
  });

  it("Pro : année en cours démarre au 1er janvier", () => {
    expect(resolvePeriod({ period: "year" }, TODAY, "PRO").from).toBe("2026-01-01");
  });

  it("Free est ramené au mois courant et le signale", () => {
    const p = resolvePeriod({ period: "year" }, TODAY, "FREE");
    expect(p).toMatchObject({ from: "2026-07-01", to: TODAY, key: "month", clamped: true });
  });

  it("Free sans paramètre n'est pas signalé comme ramené", () => {
    expect(resolvePeriod({}, TODAY, "FREE").clamped).toBe(false);
  });

  it("Free ne peut pas contourner via une plage personnalisée", () => {
    const p = resolvePeriod({ period: "custom", from: "2020-01-01", to: TODAY }, TODAY, "FREE");
    expect(p.from).toBe("2026-07-01");
    expect(p.clamped).toBe(true);
  });

  it("plage personnalisée : bornes inversées remises dans l'ordre", () => {
    const p = resolvePeriod({ period: "custom", from: "2026-07-20", to: "2026-07-10" }, TODAY, "PRO");
    expect(p.from).toBe("2026-07-10");
    expect(p.to).toBe("2026-07-20");
  });

  it("plage personnalisée : le futur est coupé à aujourd'hui", () => {
    const p = resolvePeriod({ period: "custom", from: "2026-07-01", to: "2027-01-01" }, TODAY, "PRO");
    expect(p.to).toBe(TODAY);
  });

  it("dates invalides retombent sur des bornes sûres", () => {
    const p = resolvePeriod({ period: "custom", from: "nope", to: "" }, TODAY, "PRO");
    expect(p.from).toBe("2026-07-01");
    expect(p.to).toBe(TODAY);
  });
});
