import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * @param consumesReferralCredit true uniquement pour l'événement qui matérialise
 *   un NOUVEAU checkout (checkout.session.completed) : c'est là que les mois
 *   offerts ont réellement été convertis en `trial_period_days` (voir
 *   createCheckoutSession). Remettre le compteur à 0 sur tous les événements
 *   détruisait les crédits gagnés : `customer.subscription.updated` est émis à
 *   chaque renouvellement mensuel, donc un parrain déjà abonné perdait ses mois
 *   offerts sans jamais en profiter — et `…deleted` les effaçait à la résiliation.
 */
async function syncSubscription(subscription: Stripe.Subscription, consumesReferralCredit = false) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const priceId = subscription.items.data[0]?.price.id;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: isActive ? "PRO" : "FREE",
      planStatus: subscription.status,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      ...(consumesReferralCredit && { referralCreditMonths: 0 }),
    },
  });

  // Programme de parrainage (Sprint 5) : au premier passage en PRO d'un filleul,
  // son parrain reçoit 1 mois gratuit (consommé à son prochain checkout, voir billing.ts).
  if (isActive && user.referredById && !user.referralCredited) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.referredById },
        data: { referralCreditMonths: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { referralCredited: true },
      }),
    ]);
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return Response.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return Response.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  // Idempotence : un event Stripe peut être livré plusieurs fois.
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string" ? session.subscription : session.subscription.id,
          );
          // Seul cet événement suit un checkout : c'est ici, et nulle part
          // ailleurs, que les mois de parrainage ont été convertis en trial.
          await syncSubscription(subscription, true);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handling failed", event.type, err);
    // Toujours répondre 200 : Stripe retenterait sinon indéfiniment le même event déjà marqué reçu.
  }

  return Response.json({ received: true });
}
