import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { APP_NAME, PLAN_LIMITS } from "@/lib/config";
import { createCheckoutSession } from "@/lib/actions/billing";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${APP_NAME} pricing: Free forever, or Pro with a 14-day trial — unlimited habits, history and streaks.`,
};

export default async function PricingPage() {
  const session = await auth();

  return (
    <div className="pricingpage">
      <h1 className="pricingpage__title">{APP_NAME} — Pricing</h1>
      <p className="pricingpage__subtitle">Rebuild your consistency. Cancel anytime.</p>

      <div className="pricingcards">
        <div className="pricingcard">
          <h2 className="pricingcard__name">Free</h2>
          <p className="pricingcard__price">$0</p>
          <ul className="pricingcard__features">
            <li>{PLAN_LIMITS.FREE.maxHabits} habits</li>
            <li>Current month only</li>
            <li>Mood tracking</li>
            <li>Streaks</li>
          </ul>
          {!session?.user && (
            <Link href="/login" className="btn btn--secondary">
              Get started
            </Link>
          )}
        </div>

        <div className="pricingcard pricingcard--highlight">
          <h2 className="pricingcard__name">Pro</h2>
          <p className="pricingcard__price">
            $6<span>/mo</span>
          </p>
          <p className="pricingcard__trial">14-day free trial · no card charged until then</p>
          <ul className="pricingcard__features">
            <li>{PLAN_LIMITS.PRO.maxHabits} habits</li>
            <li>Unlimited history</li>
            <li>CSV export</li>
            <li>Weekly email recap</li>
            <li>Shareable monthly recap</li>
          </ul>
          {session?.user ? (
            <form action={createCheckoutSession}>
              <input type="hidden" name="price" value="monthly" />
              <button type="submit" className="btn btn--primary">
                Start free trial — monthly
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn btn--primary">
              Sign in to subscribe
            </Link>
          )}
          {session?.user && (
            <form action={createCheckoutSession}>
              <input type="hidden" name="price" value="yearly" />
              <button type="submit" className="btn btn--link">
                or pay yearly ($49/yr) →
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
