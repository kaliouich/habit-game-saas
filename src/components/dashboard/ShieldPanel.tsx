"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { consumeStreakShield } from "@/lib/actions/shield";
import { SHIELDS_PER_MONTH } from "@/lib/config";

interface ShieldPanelProps {
  plan: "FREE" | "PRO";
  shieldsUsed: number;
  /** Jours passés du mois où aucune habitude n'a été cochée (candidats). */
  missedDates: string[];
}

/**
 * Streak Shields : absorbe un jour manqué pour qu'il ne casse pas la série.
 * On ne propose que le jour manqué le plus récent — c'est celui qui menace la
 * série en cours, et ça évite de transformer le panneau en éditeur d'historique.
 */
export function ShieldPanel({ plan, shieldsUsed, missedDates }: ShieldPanelProps) {
  const t = useTranslations("Dashboard.shieldPanel");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const errors: Record<string, string> = {
    NO_SHIELDS_LEFT: t("errorNoShields"),
    ALREADY_SHIELDED: t("errorAlreadyShielded"),
    NOT_PAST: t("errorNotPast"),
    NOT_CURRENT_MONTH: t("errorNotCurrentMonth"),
  };

  const quota = SHIELDS_PER_MONTH[plan];
  const left = Math.max(0, quota - shieldsUsed);
  const target = missedDates.length > 0 ? missedDates[missedDates.length - 1] : null;

  return (
    <div className="shieldpanel">
      <div className="shieldpanel__head">
        <span className="shieldpanel__label">🛡️ {t("title")}</span>
        <span className="shieldpanel__count">
          {left}/{quota}
        </span>
      </div>

      <div className="shieldpanel__pips" aria-hidden>
        {Array.from({ length: quota }, (_, i) => (
          <span key={i} className={i < left ? "shieldpanel__pip" : "shieldpanel__pip is-spent"} />
        ))}
      </div>

      {target ? (
        <>
          <p className="shieldpanel__hint">
            {t.rich("missedDay", {
              day: target.slice(8),
              month: target.slice(5, 7),
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <button
            type="button"
            className="shieldpanel__btn"
            disabled={left === 0 || pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await consumeStreakShield({ date: target });
                if (!res.ok) setError(errors[res.error ?? ""] ?? t("errorGeneric"));
              });
            }}
          >
            {pending ? t("shielding") : left === 0 ? t("noShieldsLeft") : t("useShield")}
          </button>
        </>
      ) : (
        <p className="shieldpanel__hint">{t("noGaps")}</p>
      )}

      {error && <p className="shieldpanel__error">{error}</p>}
      {plan === "FREE" && <p className="shieldpanel__upsell">{t("proUpsell", { count: SHIELDS_PER_MONTH.PRO })}</p>}
    </div>
  );
}
