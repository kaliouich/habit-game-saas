import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  const isActive = subscription.status === "active" || subscription.status === "trialing";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: isActive ? "PRO" : "FREE",
      planStatus: subscription.status,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      // Le crédit de parrainage (s'il y en avait) vient d'être consommé par ce checkout.
      referralCreditMonths: 0,
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
          await syncSubscription(subscription);
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
