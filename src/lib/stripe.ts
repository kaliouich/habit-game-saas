import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe?: Stripe };

/**
 * Instanciation paresseuse : le SDK Stripe rejette une apiKey vide dès le
 * constructeur, ce qui ferait planter le build/import de route (ex. le
 * webhook) tant que STRIPE_SECRET_KEY n'est pas encore configurée.
 */
function getStripeClient(): Stripe {
  if (!globalForStripe.stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    globalForStripe.stripe = new Stripe(apiKey, { apiVersion: "2026-06-24.dahlia" });
  }
  return globalForStripe.stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeClient();
    return Reflect.get(client, prop, client);
  },
});

export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  yearly: process.env.STRIPE_PRICE_YEARLY ?? "",
} as const;
