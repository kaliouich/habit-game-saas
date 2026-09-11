"use client";

import Link from "next/link";
import { useTransition } from "react";
import { seedStarterHabits } from "@/lib/actions/onboarding";

/** B9 : proposé quand l'utilisateur n'a encore aucune habitude.
 *  CTA principal -> l'assistant d'onboarding (questionnaire ou IA) ; le seed
 *  instantané des 8 habitudes classiques reste dispo en lien secondaire pour
 *  qui veut juste démarrer sans réfléchir. */
export function OnboardingBanner() {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="onboarding">
      <div>
        <p className="onboarding__title">New here?</p>
        <p className="onboarding__text">
          Let&apos;s build a habit list that fits what you actually want. Or{" "}
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
            {isPending ? "adding…" : "quick start with defaults"}
          </button>
        </p>
      </div>
      <Link href="/app/onboarding" className="btn btn--primary">
        Build my habits →
      </Link>
    </div>
  );
}
