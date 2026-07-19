"use client";

import { useTransition } from "react";
import { seedStarterHabits } from "@/lib/actions/onboarding";

/** B9 : proposé quand l'utilisateur n'a encore aucune habitude. */
export function OnboardingBanner() {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="onboarding">
      <div>
        <p className="onboarding__title">Nouveau ici ?</p>
        <p className="onboarding__text">
          Démarrez avec les habitudes classiques des self-improvers — vous pourrez tout modifier ensuite.
        </p>
      </div>
      <button
        type="button"
        className="btn btn--primary"
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            void seedStarterHabits();
          })
        }
      >
        {isPending ? "…" : "Ajouter les habitudes de démarrage"}
      </button>
    </div>
  );
}
