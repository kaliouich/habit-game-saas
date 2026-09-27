import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeEvent: { create: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
  },
}));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const mockedPrisma = vi.mocked(prisma, { deep: true });
const mockedStripe = vi.mocked(stripe, { deep: true });

function makeRequest(body: string, signature = "sig_test"): Request {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body,
  });
}

/** Squelette minimal d'un objet Subscription Stripe — seuls les champs lus
 *  par syncSubscription() sont fournis, le reste n'a pas à être fidèle. */
function makeSubscription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    trial_end: null,
    items: { data: [{ price: { id: "price_123" } }] },
    ...overrides,
  };
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    // Chaque event est nouveau par défaut (pas un doublon) sauf override explicite.
    mockedPrisma.stripeEvent.create.mockResolvedValue({} as never);
    // $transaction([...]) reçoit ce que chaque appel imbriqué a retourné : pour
    // pouvoir vérifier les arguments passés à update() via l'appel à
    // $transaction, update() doit échoir ses propres arguments (comme le
    // ferait un PrismaPromise réel une fois awaited dans une transaction).
    mockedPrisma.user.update.mockImplementation((args) => args as never);
  });

  it("rejette une requête sans en-tête stripe-signature", async () => {
    const res = await POST(makeRequest("{}", ""));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "MISSING_SIGNATURE" });
    expect(mockedStripe.webhooks.constructEvent).not.toHaveBeenCalled();
  });

  it("rejette une requête si STRIPE_WEBHOOK_SECRET n'est pas configurée", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "MISSING_SIGNATURE" });
  });

  it("rejette une signature invalide sans toucher la base", async () => {
    mockedStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_SIGNATURE" });
    expect(mockedPrisma.stripeEvent.create).not.toHaveBeenCalled();
  });

  it("un event déjà reçu (doublon) ne redéclenche pas le traitement", async () => {
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_1",
      type: "customer.subscription.updated",
      data: { object: makeSubscription() },
    } as never);
    // Le doublon vient de la contrainte unique sur l'id — create() rejette.
    mockedPrisma.stripeEvent.create.mockRejectedValue(new Error("unique constraint"));

    const res = await POST(makeRequest("{}"));
    expect(await res.json()).toEqual({ received: true, duplicate: true });
    expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("checkout.session.completed avec abonnement : passe le compte en PRO et consomme le crédit de parrainage", async () => {
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_2",
      type: "checkout.session.completed",
      data: { object: { subscription: "sub_123" } },
    } as never);
    mockedStripe.subscriptions.retrieve.mockResolvedValue(makeSubscription() as never);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      referredById: null,
      referralCredited: false,
    } as never);

    const res = await POST(makeRequest("{}"));
    expect(await res.json()).toEqual({ received: true });

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: expect.objectContaining({
        plan: "PRO",
        planStatus: "active",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_123",
        referralCreditMonths: 0,
      }),
    });
  });

  it("checkout.session.completed sans abonnement (don ponctuel) ne touche pas le plan", async () => {
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_3",
      type: "checkout.session.completed",
      data: { object: { subscription: null } },
    } as never);

    const res = await POST(makeRequest("{}"));
    expect(await res.json()).toEqual({ received: true });
    expect(mockedStripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it("customer.subscription.updated (renouvellement) NE consomme PAS le crédit de parrainage", async () => {
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_4",
      type: "customer.subscription.updated",
      data: { object: makeSubscription() },
    } as never);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      referredById: null,
      referralCredited: false,
    } as never);

    await POST(makeRequest("{}"));

    const updateCall = mockedPrisma.user.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("referralCreditMonths");
  });

  it("un abonnement dont le statut n'est plus actif repasse le compte en FREE", async () => {
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_5",
      type: "customer.subscription.deleted",
      data: { object: makeSubscription({ status: "canceled" }) },
    } as never);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      referredById: null,
      referralCredited: false,
    } as never);

    await POST(makeRequest("{}"));

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: expect.objectContaining({ plan: "FREE", planStatus: "canceled" }),
    });
  });

  it("premier passage PRO d'un filleul : le parrain reçoit 1 mois de crédit, une seule fois", async () => {
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_6",
      type: "customer.subscription.updated",
      data: { object: makeSubscription() },
    } as never);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      referredById: "referrer_1",
      referralCredited: false,
    } as never);

    await POST(makeRequest("{}"));

    expect(mockedPrisma.$transaction).toHaveBeenCalledWith([
      { where: { id: "referrer_1" }, data: { referralCreditMonths: { increment: 1 } } },
      { where: { id: "user_1" }, data: { referralCredited: true } },
    ]);
  });

  it("un filleul déjà crédité ne recrédite pas le parrain à chaque renouvellement", async () => {
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_7",
      type: "customer.subscription.updated",
      data: { object: makeSubscription() },
    } as never);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      referredById: "referrer_1",
      referralCredited: true,
    } as never);

    await POST(makeRequest("{}"));
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("un customer sans compte correspondant est ignoré sans erreur", async () => {
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_8",
      type: "customer.subscription.updated",
      data: { object: makeSubscription() },
    } as never);
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it("une erreur pendant le traitement répond quand même 200 (déjà marqué reçu, Stripe ne doit pas reréessayer)", async () => {
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_9",
      type: "customer.subscription.updated",
      data: { object: makeSubscription() },
    } as never);
    mockedPrisma.user.findUnique.mockRejectedValue(new Error("db unreachable"));

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });
});
