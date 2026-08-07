"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { stripe, STRIPE_PRICES } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { DONATION_MIN, DONATION_MAX } from "@/lib/config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Montant libre : borné MIN..MAX et arrondi au centime. `multipleOf(0.01)`
 * rejette 1.005 (qui deviendrait 100.5 centimes — Stripe exige un entier).
 */
const DonationSchema = z.object({
  amount: z.coerce
    .number()
    .finite()
    .min(DONATION_MIN, `Minimum is €${DONATION_MIN}`)
    .max(DONATION_MAX, `Maximum is €${DONATION_MAX}`)
    .multipleOf(0.01, "At most 2 decimal places"),
});

/**
 * Don ponctuel à montant libre, indépendant de l'abonnement Pro — aucun Price
 * Stripe à créer à l'avance, `price_data` construit le prix à la volée (zod
 * borne le montant avant tout appel Stripe).
 */
export async function createDonationCheckoutSession(formData: FormData): Promise<void> {
  const { amount } = DonationSchema.parse({ amount: formData.get("amount") });
  // Stripe exige un entier en centimes : 10.99 * 100 vaut 1098.9999… en
  // flottant, donc l'arrondi n'est pas cosmétique, il évite un rejet API.
  const unitAmount = Math.round(amount * 100);
  const user = await getCurrentUser();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: unitAmount,
          product_data: {
            name: "Support Habit Game",
            description: "One-time donation to support development — thank you!",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${APP_URL}/app/billing?donated=1`,
    cancel_url: `${APP_URL}/app/billing`,
  });

  if (!session.url) throw new Error("STRIPE_NO_URL");
  redirect(session.url);
}

/** Plan Pro : €0.99/mois. Pas de formData à parser. */
export async function createCheckoutSession(): Promise<void> {
  const user = await getCurrentUser();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  // Programme de parrainage : 1 mois gratuit accumulé par filleul devenu Pro,
  // consommé (remis à 0) par le webhook au succès de CE checkout.
  const trialDays = 14 + user.referralCreditMonths * 30;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE_PRICES.proMonthly, quantity: 1 }],
    subscription_data: { trial_period_days: trialDays },
    success_url: `${APP_URL}/app?upgraded=1`,
    cancel_url: `${APP_URL}/pricing`,
  });

  if (!session.url) throw new Error("STRIPE_NO_URL");
  redirect(session.url);
}

export async function createPortalSession(): Promise<void> {
  const user = await getCurrentUser();
  if (!user.stripeCustomerId) throw new Error("NO_STRIPE_CUSTOMER");

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${APP_URL}/app/billing`,
  });

  redirect(session.url);
}
