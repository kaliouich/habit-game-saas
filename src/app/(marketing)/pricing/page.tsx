import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("Pricing");

  return (
    <div className="pricingpage">
      <h1 className="pricingpage__title">
        {APP_NAME} — {t("title")}
      </h1>
      <p className="pricingpage__subtitle">{t("subtitle")}</p>

      <div className="pricingcards">
        <div className="pricingcard">
          <h2 className="pricingcard__name">{t("free.name")}</h2>
          <p className="pricingcard__price">$0</p>
          <ul className="pricingcard__features">
            <li>{t("free.habits", { count: PLAN_LIMITS.FREE.maxHabits })}</li>
            <li>{t("free.currentMonth")}</li>
            <li>{t("shared.mood")}</li>
            <li>{t("shared.streaks")}</li>
            <li>{t("free.starterBadges")}</li>
            <li>{t("free.ads")}</li>
          </ul>
          {!session?.user && (
            <Link href="/login" className="btn btn--secondary">
              {t("free.cta")}
            </Link>
          )}
        </div>

        <div className="pricingcard pricingcard--highlight">
          <h2 className="pricingcard__name">{t("pro.name")}</h2>
          <p className="pricingcard__price">
            $0.99<span>{t("pro.perMonth")}</span>
          </p>
          <p className="pricingcard__trial">{t("pro.billing")}</p>
          <ul className="pricingcard__features">
            <li>{t("pro.unlimitedHabits")}</li>
            <li>{t("pro.unlimitedHistory")}</li>
            <li>{t("pro.badges")}</li>
            <li>{t("pro.skins")}</li>
            <li>{t("pro.pause")}</li>
            <li>{t("pro.csv")}</li>
            <li>{t("pro.weeklyRecap")}</li>
            <li>{t("pro.shareableRecap")}</li>
            <li>{t("pro.noAds")}</li>
          </ul>
          {!isCheckoutEnabled() ? (
            <>
              <Link href="/login" className="btn btn--primary">
                {t("pro.ctaFree")}
              </Link>
              <p className="pricingcard__trial">{t("pro.opensShortly")}</p>
            </>
          ) : session?.user ? (
            <form action={createCheckoutSession}>
              <button type="submit" className="btn btn--primary">
                {t("pro.ctaTrial")}
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn btn--primary">
              {t("pro.ctaSignIn")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
