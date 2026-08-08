import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, RATE_LIMITS, __resetRateLimits } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    __resetRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("laisse passer jusqu'à la limite incluse", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("u1", 3, 60_000).ok).toBe(true);
    }
  });

  it("bloque au-delà de la limite", () => {
    for (let i = 0; i < 3; i++) rateLimit("u1", 3, 60_000);
    const blocked = rateLimit("u1", 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("isole les identités : un abuseur n'affecte pas les autres", () => {
    for (let i = 0; i < 5; i++) rateLimit("abuseur", 3, 60_000);
    expect(rateLimit("abuseur", 3, 60_000).ok).toBe(false);
    expect(rateLimit("innocent", 3, 60_000).ok).toBe(true);
  });

  it("rouvre après la fenêtre", () => {
    for (let i = 0; i < 3; i++) rateLimit("u1", 3, 60_000);
    expect(rateLimit("u1", 3, 60_000).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(rateLimit("u1", 3, 60_000).ok).toBe(true);
  });

  it("isole les opérations d'un même utilisateur", () => {
    // Épuiser le checkout ne doit pas fermer l'accès au portail de facturation.
    for (let i = 0; i < 20; i++) rateLimit("checkout:u1", 10, 60_000);
    expect(rateLimit("checkout:u1", 10, 60_000).ok).toBe(false);
    expect(rateLimit("portal:u1", 20, 60_000).ok).toBe(true);
  });

  it("les quotas configurés laissent passer un usage humain normal", () => {
    // Un utilisateur qui hésite et relance le checkout quelques fois ne doit
    // jamais être bloqué : la limite vise les scripts, pas les indécis.
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("checkout:u1", RATE_LIMITS.checkout.limit, RATE_LIMITS.checkout.windowMs).ok).toBe(true);
    }
  });
});
