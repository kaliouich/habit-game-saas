"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { setLogValue } from "@/lib/actions/logs";
import { habitUnitConfig, type HabitUnitKey } from "@/lib/config";

interface DayValueCellProps {
  habitId: string;
  date: string;
  value: number;
  target: number;
  unit: HabitUnitKey;
  disabled: boolean; // jour futur
}

/** Phase 1 roadmap : équivalent quantifié de DayCheckbox. Clic = +step,
 *  double-clic = remise à zéro (supprime le log, même convention que
 *  "décocher"). La cellule (18px) ne peut pas afficher un nombre lisible :
 *  le remplissage est proportionnel à value/target, la valeur exacte est
 *  dans le `title` (tooltip). */
export function DayValueCell({ habitId, date, value, target, unit, disabled }: DayValueCellProps) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [burst, setBurst] = useState<number | null>(null);
  const burstId = useRef(0);
  const { step, suffix } = habitUnitConfig(unit);

  if (disabled) {
    return <span className="cell cell--future" aria-hidden />;
  }

  const pct = target > 0 ? Math.min(1, optimistic / target) : 0;
  const isComplete = optimistic >= target;
  const label = `${optimistic}${suffix ? " " + suffix : ""} / ${target}${suffix ? " " + suffix : ""} — ${date}`;

  function commit(next: number) {
    const clamped = Math.max(0, Math.min(1_000_000, next));
    if (!isComplete && clamped >= target) {
      burstId.current += 1;
      setBurst(burstId.current);
    }
    startTransition(async () => {
      setOptimistic(clamped);
      try {
        await setLogValue({ habitId, date, value: clamped });
      } catch {
        // le revalidate ramènera l'état serveur ; rien d'autre à faire
      }
    });
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={isComplete ? "cell cell--value cell--checked" : "cell cell--value"}
      onClick={() => commit(optimistic + step)}
      onDoubleClick={(e) => {
        e.preventDefault();
        commit(0);
      }}
    >
      {optimistic > 0 && <span className="cell__fill" style={{ height: `${Math.round(pct * 100)}%` }} aria-hidden />}
      {burst !== null && (
        <span key={burst} className="cell__xp" aria-hidden onAnimationEnd={() => setBurst(null)}>
          +10
        </span>
      )}
    </button>
  );
}
