"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Billing.startOver");
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
      <h2 className="startover__title">{t("title")}</h2>
      {!confirming ? (
        <>
          <p className="startover__text">{t("description", { count: habitCount })}</p>
          <button type="button" className="btn btn--secondary startover__trigger" onClick={() => setConfirming(true)}>
            {t("title")}
          </button>
        </>
      ) : (
        <>
          <p className="startover__warning">{t("warning", { count: habitCount })}</p>
          <div className="startover__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setConfirming(false)} disabled={isPending}>
              {t("cancel")}
            </button>
            <button type="button" className="btn startover__confirm" onClick={confirm} disabled={isPending}>
              {isPending ? t("deleting") : t("confirm")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
