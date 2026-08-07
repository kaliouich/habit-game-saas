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

/**
 * Plan Pro : €0.99/mois (récurrence mensuelle).
 * Ancien abonnements (6€/mois ou 49€/an) restent actifs — le webhook
 * resynchronise le statut indépendamment du price Stripe, donc aucune
 * migration requise.
 */
export const STRIPE_PRICES = {
  proMonthly: process.env.STRIPE_PRICE_PRO ?? "",
} as const;

/**
 * Stripe est-il réellement utilisable ? Tant que les clés ne sont pas dans le
 * Secret k8s, un clic sur "Upgrade"/"Donate" partait en erreur serveur : on
 * préfère désactiver les CTA et le dire, plutôt que promettre un paiement
 * qui échoue. `checkoutEnabled` exige aussi le price (un don peut s'en passer,
 * il construit son prix à la volée).
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isCheckoutEnabled(): boolean {
  return isStripeConfigured() && Boolean(process.env.STRIPE_PRICE_PRO);
}
