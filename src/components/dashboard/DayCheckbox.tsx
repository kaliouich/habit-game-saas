"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLog } from "@/lib/actions/logs";

interface DayCheckboxProps {
  habitId: string;
  date: string;
  checked: boolean;
  disabled: boolean; // jour futur
}

/** V3 + V11 : la coche s'affiche immédiatement (optimistic), l'action tourne en fond. */
export function DayCheckbox({ habitId, date, checked, disabled }: DayCheckboxProps) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(checked);

  if (disabled) {
    return <span className="cell cell--future" aria-hidden />;
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={`${date}`}
      className={optimistic ? "cell cell--checked" : "cell"}
      onClick={() => {
        startTransition(async () => {
          setOptimistic(!optimistic);
          try {
            await toggleLog({ habitId, date });
          } catch {
            // le revalidate ramènera l'état serveur ; rien d'autre à faire
          }
        });
      }}
    >
      <svg viewBox="0 0 16 16" className="cell__check" aria-hidden>
        <path d="M3 8.5 6.5 12 13 4.5" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
