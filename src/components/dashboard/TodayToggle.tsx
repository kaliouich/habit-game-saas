"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { toggleLog } from "@/lib/actions/logs";

interface TodayToggleProps {
  habitId: string;
  date: string;
  checked: boolean;
  name: string;
}

/**
 * Cible principale du dashboard : cocher l'habitude du jour. Volontairement
 * large (48px) — c'est le seul geste que l'utilisateur fait vraiment tous les
 * jours, il ne doit pas viser une case de 18px.
 */
export function TodayToggle({ habitId, date, checked, name }: TodayToggleProps) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [burst, setBurst] = useState<number | null>(null);
  const burstId = useRef(0);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={`${name} — today`}
      className={optimistic ? "todaybtn is-on" : "todaybtn"}
      onClick={() => {
        const next = !optimistic;
        if (next) {
          burstId.current += 1;
          setBurst(burstId.current);
        }
        startTransition(async () => {
          setOptimistic(next);
          try {
            await toggleLog({ habitId, date });
          } catch {
            // le revalidate ramènera l'état serveur
          }
        });
      }}
    >
      <svg viewBox="0 0 24 24" className="todaybtn__check" aria-hidden>
        <path
          d="M5 12.5 10 17.5 19 7"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {burst !== null && (
        <span key={burst} className="todaybtn__xp" aria-hidden onAnimationEnd={() => setBurst(null)}>
          +10 XP
        </span>
      )}
    </button>
  );
}
