"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetHabitsAction } from "@/lib/actions/onboarding";

interface StartOverPanelProps {
  habitCount: number;
}

/** Danger zone (Billing page) : supprime toutes les habitudes et renvoie
 *  vers l'onboarding. Confirmation à deux temps dans la page elle-même
 *  (pas de window.confirm — cohérent avec le reste de l'app, qui n'en
 *  utilise nulle part ailleurs) : un premier clic révèle l'avertissement
 *  explicite + Confirm/Cancel, rien ne se supprime sur le premier clic. */
export function StartOverPanel({ habitCount }: StartOverPanelProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (habitCount === 0) return null;

  function confirm() {
    startTransition(async () => {
      await resetHabitsAction();
      router.push("/app/onboarding");
    });
  }

  return (
    <div className="billingcard startover">
      <h2 className="startover__title">Start over</h2>
      {!confirming ? (
        <>
          <p className="startover__text">
            Delete all {habitCount} habit{habitCount === 1 ? "" : "s"} and their history, then rebuild your list from
            scratch.
          </p>
          <button type="button" className="btn btn--secondary startover__trigger" onClick={() => setConfirming(true)}>
            Start over
          </button>
        </>
      ) : (
        <>
          <p className="startover__warning">
            This deletes all {habitCount} habit{habitCount === 1 ? "" : "s"} and every day you&apos;ve logged for
            them. This can&apos;t be undone.
          </p>
          <div className="startover__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setConfirming(false)} disabled={isPending}>
              Cancel
            </button>
            <button type="button" className="btn startover__confirm" onClick={confirm} disabled={isPending}>
              {isPending ? "Deleting…" : "Yes, delete everything"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
