"use client";

import { useState } from "react";
import { habitUnitConfig } from "@/lib/config";
import type { HabitDraft } from "@/lib/onboardingCatalog";

interface MultiChoiceScreenProps {
  title: string;
  candidates: HabitDraft[];
  onContinue: (selected: HabitDraft[]) => void;
}

function targetLabel(draft: HabitDraft): string | null {
  if (draft.unit === "TIMES") return null;
  const unit = habitUnitConfig(draft.unit);
  const label = draft.unit === "COUNT" && draft.unitLabel ? draft.unitLabel : unit.suffix;
  return draft.targetValue ? `${draft.targetValue}${label ? ` ${label}` : ""}` : null;
}

/** Écran final du chemin questionnaire — sélection multiple, Continue explicite
 *  (contrairement aux 3 écrans single-choice qui précèdent, qui avancent au clic). */
export function MultiChoiceScreen({ title, candidates, onContinue }: MultiChoiceScreenProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(candidates.map((_, i) => i)));

  function toggle(i: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const picked = candidates.filter((_, i) => selected.has(i));

  return (
    <div className="onboardscreen">
      <h1 className="onboardscreen__title">{title}</h1>
      <p className="onboardscreen__subtitle">Tap to toggle — you can change everything later.</p>

      <div className="onboardpick">
        {candidates.map((draft, i) => {
          const isOn = selected.has(i);
          const target = targetLabel(draft);
          return (
            <button
              key={draft.name}
              type="button"
              className={`onboardpick__item${isOn ? " onboardpick__item--on" : ""}`}
              onClick={() => toggle(i)}
              aria-pressed={isOn}
            >
              <span className="onboardpick__check">{isOn ? "✓" : ""}</span>
              <span className="onboardpick__emoji">{draft.emoji}</span>
              <span className="onboardpick__name">{draft.name}</span>
              {target && <span className="onboardpick__target">{target}</span>}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn--primary"
        disabled={picked.length === 0}
        onClick={() => onContinue(picked)}
      >
        Continue{picked.length > 0 ? ` (${picked.length})` : ""}
      </button>
    </div>
  );
}
