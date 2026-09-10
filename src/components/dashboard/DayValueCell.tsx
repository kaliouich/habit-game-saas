"use client";

import { createPortal } from "react-dom";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
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

/** Équivalent quantifié de DayCheckbox — même contrat qu'une case à cocher :
 *  un clic suffit à valider la cible du jour (commit(target)), un clic sur
 *  une cellule déjà complète la décoche (commit(0)). L'ancien design
 *  ("clic = +step") demandait un clic PAR step pour atteindre la cible
 *  (jusqu'à 8 clics pour "8 verres d'eau") — remplacé sur retour direct
 *  d'usage. Double-clic ouvre un éditeur pour une valeur partielle/exacte
 *  (ex. "seulement 4 des 8 verres"), plutôt que l'ancien double-clic qui
 *  remettait tout à zéro sans confirmation ni moyen de juste corriger un
 *  surplus d'un clic. La cellule (18px) ne peut pas afficher un nombre
 *  lisible : le remplissage est proportionnel à value/target, la valeur
 *  exacte est dans le `title` (tooltip) et dans l'éditeur. */
export function DayValueCell({ habitId, date, value, target, unit, disabled }: DayValueCellProps) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [burst, setBurst] = useState<number | null>(null);
  const burstId = useRef(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { step, suffix } = habitUnitConfig(unit);

  useEffect(() => {
    if (!isEditing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsEditing(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isEditing]);

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

  function openEditor() {
    setDraft(String(optimistic));
    setIsEditing(true);
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        className={isComplete ? "cell cell--value cell--checked" : "cell cell--value"}
        onClick={() => commit(isComplete ? 0 : target)}
        onDoubleClick={(e) => {
          e.preventDefault();
          openEditor();
        }}
      >
        {optimistic > 0 && <span className="cell__fill" style={{ height: `${Math.round(pct * 100)}%` }} aria-hidden />}
        {burst !== null && (
          <span key={burst} className="cell__xp" aria-hidden onAnimationEnd={() => setBurst(null)}>
            +10
          </span>
        )}
      </button>
      {isEditing &&
        createPortal(
          <>
            <div className="valuecell__backdrop" onClick={() => setIsEditing(false)} />
            <form
              className="valuecell__panel"
              onSubmit={(e) => {
                e.preventDefault();
                commit(Number(draft) || 0);
                setIsEditing(false);
              }}
            >
              <p className="valuecell__title">
                {date}
                {suffix ? ` · ${suffix}` : ""}
              </p>
              <div className="valuecell__stepper">
                <button type="button" onClick={() => setDraft(String(Math.max(0, Number(draft) - step)))}>
                  −
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="button" onClick={() => setDraft(String(Number(draft) + step))}>
                  +
                </button>
              </div>
              <p className="valuecell__hint">Target: {target}{suffix ? ` ${suffix}` : ""}</p>
              <div className="valuecell__actions">
                <button type="button" className="valuecell__clear" onClick={() => { commit(0); setIsEditing(false); }}>
                  Clear
                </button>
                <button type="submit">Save</button>
              </div>
            </form>
          </>,
          document.getElementById("habitmenu-portal") ?? document.body,
        )}
    </>
  );
}
