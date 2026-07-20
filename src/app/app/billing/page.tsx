import Link from "next/link";
import { getCurrentUser } from "@/lib/user";
import { createCheckoutSession, createPortalSession } from "@/lib/actions/billing";
import { CopyReferralLink } from "@/components/CopyReferralLink";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function BillingPage() {
  const user = await getCurrentUser();
  const trialDays = 14 + user.referralCreditMonths * 30;

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
              Upgrade to Pro — {trialDays}-day trial
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

      {user.referralCode && (
        <div className="billingcard referral">
          <h2 className="referral__title">Refer a friend, get a free month</h2>
          <p className="referral__text">
            Every friend who upgrades to Pro earns you 1 free month — automatically applied to your
            next checkout.
          </p>
          <CopyReferralLink link={`${APP_URL}/login?ref=${user.referralCode}`} />
          {user.referralCreditMonths > 0 && (
            <p className="referral__credit">
              🎁 You have {user.referralCreditMonths} free month{user.referralCreditMonths > 1 ? "s" : ""} waiting
              — it&apos;ll be applied automatically on your next upgrade.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
