import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  },
  STRIPE_PRICES: { proMonthly: "price_pro_test" },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { update: vi.fn() } },
}));

vi.mock("@/lib/user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn(),
  RATE_LIMITS: {
    checkout: { limit: 10, windowMs: 3_600_000 },
    portal: { limit: 20, windowMs: 3_600_000 },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { createCheckoutSession, createDonationCheckoutSession, createPortalSession } from "./billing";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { rateLimit } from "@/lib/rateLimit";

const mockedStripe = vi.mocked(stripe, { deep: true });
const mockedPrisma = vi.mocked(prisma, { deep: true });
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedRateLimit = vi.mocked(rateLimit);

const BASE_USER = {
  id: "user_1",
  email: "user@example.com",
  stripeCustomerId: null as string | null,
  referralCreditMonths: 0,
};

function donationForm(amount: string) {
  const fd = new FormData();
  fd.set("amount", amount);
  return fd;
}

describe("billing server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ ...BASE_USER } as never);
    mockedRateLimit.mockResolvedValue({ ok: true, retryAfter: 0 });
  });

  describe("createCheckoutSession", () => {
    it("crée un client Stripe si le compte n'en a pas encore un, puis redirige vers le checkout", async () => {
      mockedStripe.customers.create.mockResolvedValue({ id: "cus_new" } as never);
      mockedStripe.checkout.sessions.create.mockResolvedValue({ url: "https://stripe.test/checkout" } as never);

      await expect(createCheckoutSession()).rejects.toThrow("REDIRECT:https://stripe.test/checkout");

      expect(mockedStripe.customers.create).toHaveBeenCalledWith({
        email: "user@example.com",
        metadata: { userId: "user_1" },
      });
      expect(mockedPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { stripeCustomerId: "cus_new" },
      });
      expect(mockedStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "subscription", customer: "cus_new" }),
      );
    });

    it("réutilise le customer Stripe existant sans en recréer un", async () => {
      mockedGetCurrentUser.mockResolvedValue({ ...BASE_USER, stripeCustomerId: "cus_existing" } as never);
      mockedStripe.checkout.sessions.create.mockResolvedValue({ url: "https://stripe.test/checkout" } as never);

      await expect(createCheckoutSession()).rejects.toThrow("REDIRECT:");
      expect(mockedStripe.customers.create).not.toHaveBeenCalled();
    });

    it("ajoute les mois de parrainage accumulés à l'essai gratuit", async () => {
      mockedGetCurrentUser.mockResolvedValue({
        ...BASE_USER,
        stripeCustomerId: "cus_existing",
        referralCreditMonths: 2,
      } as never);
      mockedStripe.checkout.sessions.create.mockResolvedValue({ url: "https://stripe.test/checkout" } as never);

      await expect(createCheckoutSession()).rejects.toThrow("REDIRECT:");
      expect(mockedStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ subscription_data: { trial_period_days: 14 + 2 * 30 } }),
      );
    });

    it("refuse quand le rate limit est dépassé, sans jamais appeler Stripe", async () => {
      mockedRateLimit.mockResolvedValue({ ok: false, retryAfter: 42 });
      await expect(createCheckoutSession()).rejects.toThrow("RATE_LIMITED");
      expect(mockedStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it("lève une erreur explicite si Stripe ne renvoie pas d'URL", async () => {
      mockedStripe.checkout.sessions.create.mockResolvedValue({ url: null } as never);
      await expect(createCheckoutSession()).rejects.toThrow("STRIPE_NO_URL");
    });
  });

  describe("createDonationCheckoutSession", () => {
    it("construit un prix Stripe à la volée, en centimes, pour le montant demandé", async () => {
      mockedGetCurrentUser.mockResolvedValue({ ...BASE_USER, stripeCustomerId: "cus_existing" } as never);
      mockedStripe.checkout.sessions.create.mockResolvedValue({ url: "https://stripe.test/donate" } as never);

      await expect(createDonationCheckoutSession(donationForm("12.50"))).rejects.toThrow("REDIRECT:");
      expect(mockedStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
          line_items: [expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 1250 }) })],
        }),
      );
    });

    it("rejette un montant sous le minimum", async () => {
      await expect(createDonationCheckoutSession(donationForm("0.50"))).rejects.toThrow();
      expect(mockedStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it("rejette un montant au-dessus du maximum", async () => {
      await expect(createDonationCheckoutSession(donationForm("501"))).rejects.toThrow();
      expect(mockedStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it("rejette un montant à plus de 2 décimales", async () => {
      await expect(createDonationCheckoutSession(donationForm("10.999"))).rejects.toThrow();
      expect(mockedStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });

  describe("createPortalSession", () => {
    it("ouvre le portail de facturation pour un client Stripe existant", async () => {
      mockedGetCurrentUser.mockResolvedValue({ ...BASE_USER, stripeCustomerId: "cus_existing" } as never);
      mockedStripe.billingPortal.sessions.create.mockResolvedValue({ url: "https://stripe.test/portal" } as never);

      await expect(createPortalSession()).rejects.toThrow("REDIRECT:https://stripe.test/portal");
      expect(mockedStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: "cus_existing",
        return_url: expect.stringContaining("/app/billing"),
      });
    });

    it("refuse un compte sans client Stripe", async () => {
      await expect(createPortalSession()).rejects.toThrow("NO_STRIPE_CUSTOMER");
      expect(mockedStripe.billingPortal.sessions.create).not.toHaveBeenCalled();
    });

    it("refuse quand le rate limit est dépassé", async () => {
      mockedGetCurrentUser.mockResolvedValue({ ...BASE_USER, stripeCustomerId: "cus_existing" } as never);
      mockedRateLimit.mockResolvedValue({ ok: false, retryAfter: 10 });
      await expect(createPortalSession()).rejects.toThrow("RATE_LIMITED");
    });
  });
});
