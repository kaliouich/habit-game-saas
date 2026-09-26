"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { seedStarterHabits } from "@/lib/actions/onboarding";

/** B9 : proposé quand l'utilisateur n'a encore aucune habitude.
 *  CTA principal -> l'assistant d'onboarding (questionnaire ou IA) ; le seed
 *  instantané des 8 habitudes classiques reste dispo en lien secondaire pour
 *  qui veut juste démarrer sans réfléchir. */
export function OnboardingBanner() {
  const t = useTranslations("Dashboard.onboardingBanner");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="onboarding">
      <div>
        <p className="onboarding__title">{t("title")}</p>
        <p className="onboarding__text">
          {t("text")}{" "}
          <button
            type="button"
            className="onboarding__quicklink"
            disabled={isPending}
            onClick={() =>
              startTransition(() => {
                void seedStarterHabits();
              })
            }
          >
            {isPending ? t("adding") : t("quickStart")}
          </button>
        </p>
      </div>
      <Link href="/app/onboarding" className="btn btn--primary">
        {t("cta")}
      </Link>
    </div>
  );
}
