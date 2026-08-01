import Link from "next/link";
import { getCurrentUser } from "@/lib/user";
import { createCheckoutSession, createPortalSession, createDonationCheckoutSession } from "@/lib/actions/billing";
import { CopyReferralLink } from "@/components/CopyReferralLink";
import { DonateForm } from "@/components/DonateForm";
import { currentMonth } from "@/lib/dates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface BillingPageProps {
  searchParams: Promise<{ donated?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const { donated } = await searchParams;
  const user = await getCurrentUser();
  const trialDays = 14 + user.referralCreditMonths * 30;
  const month = currentMonth(user.timezone);
  const recapUrl = `${APP_URL}/recap/${user.id}/${month}`;

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

      {user.plan === "PRO" && (
        <div className="billingexport">
          <h2 className="billingexport__title">Export & Share</h2>
          <div className="billingexport__row">
            <span className="billingexport__label">Download all habit data as CSV</span>
            <a href="/api/export" className="btn btn--secondary" download>
              Export CSV
            </a>
          </div>
          <div className="billingexport__row">
            <span className="billingexport__label">Share this month&apos;s recap</span>
            <CopyReferralLink link={recapUrl} />
          </div>
          <p className="billingexport__copy">{recapUrl}</p>
        </div>
      )}

      <div className="billingcard donate">
        <h2 className="donate__title">Support this project</h2>
        <p className="donate__text">
          Habit Game is built and run by a small team. Every donation goes straight back into
          keeping the servers running and shipping the features on the roadmap — no ads, no
          data selling, just a tool we want to keep making better. If it&apos;s helped you build a
          habit, anything you give helps us keep it going.
        </p>
        {donated === "1" && <p className="donate__thanks">🎉 Thank you for your support!</p>}
        <DonateForm action={createDonationCheckoutSession} />
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
