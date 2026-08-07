import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { APP_NAME, PLAN_LIMITS } from "@/lib/config";
import { createCheckoutSession } from "@/lib/actions/billing";
import { isCheckoutEnabled } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${APP_NAME} pricing: Free forever, or Pro at €0.99/month (billed €9.99/year) — unlimited habits, history, badges and CSV export.`,
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
            <li>3 starter badges</li>
            <li>Contains ads</li>
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
            $0.99<span>/mo</span>
          </p>
          <p className="pricingcard__trial">billed $9.99/year · 14-day free trial · no card charged until then</p>
          <ul className="pricingcard__features">
            <li>Unlimited habits</li>
            <li>Unlimited history</li>
            <li>Full badge set &amp; XP levels</li>
            <li>All board skins</li>
            <li>Pause / vacation mode</li>
            <li>CSV export</li>
            <li>Weekly email recap</li>
            <li>Shareable monthly recap</li>
            <li>No ads</li>
          </ul>
          {!isCheckoutEnabled() ? (
            <>
              <Link href="/login" className="btn btn--primary">
                Start free — 5 habits
              </Link>
              <p className="pricingcard__trial">Pro subscriptions open shortly.</p>
            </>
          ) : session?.user ? (
            <form action={createCheckoutSession}>
              <button type="submit" className="btn btn--primary">
                Start free trial
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn btn--primary">
              Sign in to subscribe
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
