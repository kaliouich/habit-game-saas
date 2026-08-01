"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { toggleLog } from "@/lib/actions/logs";

interface DayCheckboxProps {
  habitId: string;
  date: string;
  checked: boolean;
  disabled: boolean; // jour futur
  /** "trail" = piste compacte du board (Sprint 7) ; défaut = case de grille. */
  variant?: "grid" | "trail";
  dayNum?: number;
  isToday?: boolean;
  /** Jour couvert par une pause ou un Streak Shield. */
  isPaused?: boolean;
}

/** V3 + V11 : la coche s'affiche immédiatement (optimistic), l'action tourne en fond. */
export function DayCheckbox({
  habitId,
  date,
  checked,
  disabled,
  variant = "grid",
  dayNum,
  isToday = false,
  isPaused = false,
}: DayCheckboxProps) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(checked);
  // `null` = aucune animation en cours ; un id incrémental force le remount du
  // flottant pour rejouer l'animation même sur deux coches rapprochées.
  const [burst, setBurst] = useState<number | null>(null);
  const burstId = useRef(0);
  const trail = variant === "trail";

  if (disabled) {
    return trail ? (
      <span className="pip pip--future" aria-hidden>
        {dayNum}
      </span>
    ) : (
      <span className="cell cell--future" aria-hidden />
    );
  }

  if (trail) {
    const cls = [
      "pip",
      optimistic ? "is-on" : "",
      isToday ? "is-today" : "",
      isPaused && !optimistic ? "is-shielded" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={optimistic}
        aria-label={date}
        className={cls}
        onClick={() => {
          startTransition(async () => {
            setOptimistic(!optimistic);
            try {
              await toggleLog({ habitId, date });
            } catch {
              // le revalidate ramènera l'état serveur
            }
          });
        }}
      >
        {dayNum}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={`${date}`}
      className={optimistic ? "cell cell--checked" : "cell"}
      onClick={() => {
        const next = !optimistic;
        // XP flottant seulement quand on coche : décocher n'est pas une victoire.
        if (next) {
          burstId.current += 1;
          setBurst(burstId.current);
        }
        startTransition(async () => {
          setOptimistic(next);
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
      {burst !== null && (
        <span
          key={burst}
          className="cell__xp"
          aria-hidden
          onAnimationEnd={() => setBurst(null)}
        >
          +10
        </span>
      )}
    </button>
  );
}
