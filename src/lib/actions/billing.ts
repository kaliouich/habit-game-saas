"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { stripe, STRIPE_PRICES } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const CheckoutSchema = z.object({
  price: z.enum(["monthly", "yearly"]),
});

export async function createCheckoutSession(formData: FormData): Promise<void> {
  const { price } = CheckoutSchema.parse({ price: formData.get("price") });
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
    line_items: [{ price: STRIPE_PRICES[price], quantity: 1 }],
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
