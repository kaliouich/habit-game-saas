import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession, createPortalSession, createDonationCheckoutSession } from "@/lib/actions/billing";
import { CopyReferralLink } from "@/components/CopyReferralLink";
import { DonateForm } from "@/components/DonateForm";
import { SubscriptionComparison } from "@/components/SubscriptionComparison";
import { StartOverPanel } from "@/components/StartOverPanel";
import { isStripeConfigured, isCheckoutEnabled } from "@/lib/stripe";
import { currentMonth } from "@/lib/dates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface BillingPageProps {
  searchParams: Promise<{ donated?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const { donated } = await searchParams;
  const user = await getCurrentUser();
  const stripeReady = isStripeConfigured();
  const checkoutEnabled = isCheckoutEnabled();
  const trialDays = 14 + user.referralCreditMonths * 30;
  const month = currentMonth(user.timezone);
  const recapUrl = `${APP_URL}/recap/${user.id}/${month}`;
  const habitCount = await prisma.habit.count({ where: { userId: user.id } });
  const t = await getTranslations("Billing");

  return (
    <div className="billingpage">
      <Link href="/app" className="billingpage__back">
        {t("back")}
      </Link>
      <h1 className="billingpage__title">{t("title")}</h1>

      <div className="billingcard">
        <p className="billingcard__row">
          <span>{t("plan")}</span>
          <strong>{user.plan}</strong>
        </p>
        {user.planStatus && (
          <p className="billingcard__row">
            <span>{t("status")}</span>
            <strong>{user.planStatus}</strong>
          </p>
        )}
        {user.trialEndsAt && (
          <p className="billingcard__row">
            <span>{t("trialEnds")}</span>
            <strong>{user.trialEndsAt.toLocaleDateString()}</strong>
          </p>
        )}

        {!checkoutEnabled ? (
          <p className="billingcard__soon">{t("paymentsSoon")}</p>
        ) : user.plan === "FREE" ? (
          <form action={createCheckoutSession}>
            <button type="submit" className="btn btn--primary">
              {t("upgradeButton", { trialDays })}
            </button>
          </form>
        ) : (
          <form action={createPortalSession}>
            <button type="submit" className="btn btn--secondary">
              {t("manageSubscription")}
            </button>
          </form>
        )}
      </div>

      <SubscriptionComparison />

      {user.plan === "PRO" && (
        <div className="billingexport">
          <h2 className="billingexport__title">{t("exportShare")}</h2>
          <div className="billingexport__row">
            <span className="billingexport__label">{t("downloadCsv")}</span>
            <a href="/api/export" className="btn btn--secondary" download>
              {t("exportCsvButton")}
            </a>
          </div>
          <div className="billingexport__row">
            <span className="billingexport__label">{t("shareRecap")}</span>
            <CopyReferralLink link={recapUrl} />
          </div>
          <p className="billingexport__copy">{recapUrl}</p>
          <div className="billingexport__row">
            <span className="billingexport__label">{t("recapImageLabel")}</span>
            <a href={`${recapUrl}/opengraph-image`} className="btn btn--secondary" download>
              {t("downloadImage")}
            </a>
          </div>
        </div>
      )}

      <div className="billingcard donate">
        <h2 className="donate__title">{t("supportTitle")}</h2>
        <p className="donate__text">{t("supportText")}</p>
        {donated === "1" && <p className="donate__thanks">{t("donateThanks")}</p>}
        {stripeReady ? <DonateForm action={createDonationCheckoutSession} /> : <p className="billingcard__soon">{t("donationsSoon")}</p>}
      </div>

      {user.referralCode && (
        <div className="billingcard referral">
          <h2 className="referral__title">{t("referralTitle")}</h2>
          <p className="referral__text">{t("referralText")}</p>
          <CopyReferralLink link={`${APP_URL}/login?ref=${user.referralCode}`} />
          {user.referralCreditMonths > 0 && (
            <p className="referral__credit">{t("referralCredit", { count: user.referralCreditMonths })}</p>
          )}
        </div>
      )}

      <StartOverPanel habitCount={habitCount} />
    </div>
  );
}
