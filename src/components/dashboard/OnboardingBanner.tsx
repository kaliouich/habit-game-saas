"use client";

import { useTransition } from "react";
import { seedStarterHabits } from "@/lib/actions/onboarding";

/** B9 : proposé quand l'utilisateur n'a encore aucune habitude. */
export function OnboardingBanner() {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="onboarding">
      <div>
        <p className="onboarding__title">New here?</p>
        <p className="onboarding__text">
          Start with the classic self-improver habits — you can change everything afterward.
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
        {isPending ? "…" : "Add starter habits"}
      </button>
    </div>
  );
}
