import Link from "next/link";
import { getCurrentUser } from "@/lib/user";
import { createCheckoutSession, createPortalSession } from "@/lib/actions/billing";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await getCurrentUser();

  return (
    <div className="billingpage">
      <Link href="/app" className="billingpage__back">
        ← Back to dashboard
      </Link>
      <h1 className="billingpage__title">Billing</h1>

      <div className="billingcard">
        <p className="billingcard__row">
          <span>Plan</span>
          <strong>{user.plan}</strong>
        </p>
        {user.planStatus && (
          <p className="billingcard__row">
            <span>Status</span>
            <strong>{user.planStatus}</strong>
          </p>
        )}
        {user.trialEndsAt && (
          <p className="billingcard__row">
            <span>Trial ends</span>
            <strong>{user.trialEndsAt.toLocaleDateString()}</strong>
          </p>
        )}

        {user.plan === "FREE" ? (
          <form action={createCheckoutSession}>
            <input type="hidden" name="price" value="monthly" />
            <button type="submit" className="btn btn--primary">
              Upgrade to Pro — $6/mo (14-day trial)
            </button>
          </form>
        ) : (
          <form action={createPortalSession}>
            <button type="submit" className="btn btn--secondary">
              Manage subscription
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
