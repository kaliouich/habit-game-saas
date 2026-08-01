"use client";

import { useState, useTransition } from "react";
import { useStreakShield } from "@/lib/actions/shield";
import { SHIELDS_PER_MONTH } from "@/lib/config";

interface ShieldPanelProps {
  plan: "FREE" | "PRO";
  shieldsUsed: number;
  /** Jours passés du mois où aucune habitude n'a été cochée (candidats). */
  missedDates: string[];
}

const ERRORS: Record<string, string> = {
  NO_SHIELDS_LEFT: "No shields left this month.",
  ALREADY_SHIELDED: "That day is already shielded.",
  NOT_PAST: "You can still complete today.",
  NOT_CURRENT_MONTH: "Shields only cover the current month.",
};

/**
 * Streak Shields : absorbe un jour manqué pour qu'il ne casse pas la série.
 * On ne propose que le jour manqué le plus récent — c'est celui qui menace la
 * série en cours, et ça évite de transformer le panneau en éditeur d'historique.
 */
export function ShieldPanel({ plan, shieldsUsed, missedDates }: ShieldPanelProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const quota = SHIELDS_PER_MONTH[plan];
  const left = Math.max(0, quota - shieldsUsed);
  const target = missedDates.length > 0 ? missedDates[missedDates.length - 1] : null;

  return (
    <div className="shieldpanel">
      <div className="shieldpanel__head">
        <span className="shieldpanel__label">🛡️ Streak Shields</span>
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
            You missed <strong>{target.slice(8)}/{target.slice(5, 7)}</strong>. Shield it so your
            streak survives.
          </p>
          <button
            type="button"
            className="shieldpanel__btn"
            disabled={left === 0 || pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await useStreakShield({ date: target });
                if (!res.ok) setError(ERRORS[res.error ?? ""] ?? "Could not use shield.");
              });
            }}
          >
            {pending ? "Shielding…" : left === 0 ? "No shields left" : "Use a shield"}
          </button>
        </>
      ) : (
        <p className="shieldpanel__hint">No gaps this month. Streak intact. ⚔️</p>
      )}

      {error && <p className="shieldpanel__error">{error}</p>}
      {plan === "FREE" && (
        <p className="shieldpanel__upsell">Pro gets {SHIELDS_PER_MONTH.PRO} shields a month.</p>
      )}
    </div>
  );
}
