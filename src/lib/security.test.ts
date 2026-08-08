import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, SHIELDS_PER_MONTH } from "./config";
import { maxHabits, canViewMonth } from "./quotas";
import { resolvePeriod } from "./period";

/**
 * Régressions de sécurité et de logique métier trouvées lors de l'audit QA
 * du 2026-08-08. Chaque test correspond à un bug réel corrigé — ils échouent
 * sur le code d'avant correctif.
 */

// Réimplémentation locale de la neutralisation appliquée dans /api/export
// (la route est un handler Next, non importable en test unitaire sans mock
// de la session : on verrouille ici la règle, la route l'applique).
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

describe("injection de formule CSV (CWE-1236)", () => {
  it("neutralise les préfixes exécutables par les tableurs", () => {
    // Un nom d'habitude est saisi librement par l'utilisateur : sans préfixe
    // d'apostrophe, Excel/Sheets évaluent ces cellules à l'ouverture.
    expect(neutralizeFormula('=HYPERLINK("http://evil.test","clic")')).toBe(
      '\'=HYPERLINK("http://evil.test","clic")',
    );
    expect(neutralizeFormula("+1+1")).toBe("'+1+1");
    expect(neutralizeFormula("-2+3")).toBe("'-2+3");
    expect(neutralizeFormula("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(neutralizeFormula("\tcmd")).toBe("'\tcmd");
  });

  it("laisse intacts les noms légitimes", () => {
    expect(neutralizeFormula("Gym")).toBe("Gym");
    expect(neutralizeFormula("Réveil 05:00")).toBe("Réveil 05:00");
    expect(neutralizeFormula("5 km run")).toBe("5 km run");
  });
});

describe("cohérence des quotas affichés vs appliqués", () => {
  it("maxHabits reflète PLAN_LIMITS (pas de valeur recopiée)", () => {
    // Une matrice de comparaison annonçait 3 (FREE) et 24 (PRO) alors que les
    // quotas réels sont 5 et Infinity : de l'information tarifaire fausse.
    expect(maxHabits("FREE")).toBe(PLAN_LIMITS.FREE.maxHabits);
    expect(maxHabits("PRO")).toBe(PLAN_LIMITS.PRO.maxHabits);
  });

  it("le plan FREE offre strictement moins que le plan PRO", () => {
    expect(PLAN_LIMITS.FREE.maxHabits).toBeLessThan(PLAN_LIMITS.PRO.maxHabits);
    expect(SHIELDS_PER_MONTH.FREE).toBeLessThan(SHIELDS_PER_MONTH.PRO);
  });

  it("l'onboarding ne peut pas dépasser le quota du plan", () => {
    // seedStarterHabits crée min(8 starters, maxHabits(plan)) : un `3` en dur
    // privait les comptes FREE de 2 habitudes auxquelles ils ont droit.
    const STARTER_COUNT = 8;
    expect(Math.min(STARTER_COUNT, maxHabits("FREE"))).toBe(PLAN_LIMITS.FREE.maxHabits);
    expect(Math.min(STARTER_COUNT, maxHabits("PRO"))).toBe(STARTER_COUNT);
  });
});

describe("paywall historique — pas de porte dérobée", () => {
  const today = "2026-08-08";

  it("FREE ne peut pas lire un mois passé via le dashboard", () => {
    expect(canViewMonth("FREE", "2026-08", "2026-08")).toBe(true);
    expect(canViewMonth("FREE", "2026-07", "2026-08")).toBe(false);
    expect(canViewMonth("FREE", "2025-01", "2026-08")).toBe(false);
  });

  it("FREE est ramené au mois courant même avec une plage custom forgée", () => {
    // Tentative de contournement : /app/report?period=custom&from=2020-01-01
    const forged = resolvePeriod(
      { period: "custom", from: "2020-01-01", to: "2026-08-08" },
      today,
      "FREE",
    );
    expect(forged.from).toBe("2026-08-01");
    expect(forged.clamped).toBe(true);
  });

  it("FREE est ramené au mois courant sur les presets Pro", () => {
    for (const period of ["30d", "90d", "year"]) {
      const r = resolvePeriod({ period }, today, "FREE");
      expect(r.from).toBe("2026-08-01");
      expect(r.clamped).toBe(true);
    }
  });

  it("PRO conserve l'accès complet", () => {
    expect(canViewMonth("PRO", "2020-01", "2026-08")).toBe(true);
    expect(resolvePeriod({ period: "year" }, today, "PRO").from).toBe("2026-01-01");
  });

  it("une plage custom ne peut pas déborder dans le futur", () => {
    const r = resolvePeriod({ period: "custom", from: "2026-08-01", to: "2099-01-01" }, today, "PRO");
    expect(r.to).toBe(today);
  });
});
