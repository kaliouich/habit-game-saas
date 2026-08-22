"use client";

import { useRef, useState, useTransition } from "react";
import { createHabit } from "@/lib/actions/habits";
import { HABIT_UNITS } from "@/lib/config";

/** V2 : ajout inline dans la sidebar, comme une nouvelle ligne du tableur. */
export function AddHabitForm({ canAdd, limit }: { canAdd: boolean; limit: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"BUILD" | "QUIT">("BUILD");
  const [unit, setUnit] = useState<string>("TIMES");

  if (!canAdd) {
    return <p className="sidebar__limit">Limite de {limit} habitudes atteinte</p>;
  }

  // Phase 1 roadmap : QUIT n'a pas d'unité (chronomètre), et TIMES reste la
  // case à cocher classique — la cible/l'unité libre ne s'affichent que pour
  // les unités quantifiées d'une habitude BUILD.
  const showQuantified = type === "BUILD" && unit !== "TIMES";

  return (
    <form
      ref={formRef}
      className="addhabit"
      action={(formData: FormData) => {
        const name = String(formData.get("name") ?? "").trim();
        const emoji = String(formData.get("emoji") ?? "").trim();
        const formType = formData.get("type") === "QUIT" ? "QUIT" : "BUILD";
        const formUnit = String(formData.get("unit") ?? "TIMES");
        const targetRaw = String(formData.get("targetValue") ?? "").trim();
        const unitLabel = String(formData.get("unitLabel") ?? "").trim();
        if (!name) return;
        startTransition(async () => {
          const res = await createHabit({
            name,
            emoji: emoji || undefined,
            type: formType,
            unit: formType === "BUILD" ? formUnit : "TIMES",
            targetValue: targetRaw === "" ? undefined : Number(targetRaw),
            unitLabel: unitLabel || undefined,
          });
          if (res.ok) {
            formRef.current?.reset();
            setType("BUILD");
            setUnit("TIMES");
            setError(null);
          } else {
            setError(res.error ?? "Erreur");
          }
        });
      }}
    >
      <input name="emoji" className="addhabit__emoji" placeholder="✨" maxLength={8} autoComplete="off" />
      <input name="name" className="addhabit__name" placeholder="New habit…" maxLength={40} required autoComplete="off" />
      <select
        name="type"
        className="addhabit__type"
        value={type}
        onChange={(e) => setType(e.target.value as "BUILD" | "QUIT")}
        title="Build = à faire · Quit = à éviter"
      >
        <option value="BUILD">Build</option>
        <option value="QUIT">Quit</option>
      </select>
      <button type="submit" className="addhabit__submit" disabled={isPending} aria-label="Add habit">
        +
      </button>
      {type === "BUILD" && (
        <div className="addhabit__extra">
          <select
            name="unit"
            className="addhabit__unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            title="Comment cette habitude se mesure-t-elle chaque jour ?"
          >
            {HABIT_UNITS.map((u) => (
              <option key={u.key} value={u.key}>
                {u.label}
              </option>
            ))}
          </select>
          {showQuantified && (
            <>
              <input
                name="targetValue"
                type="number"
                step="any"
                min={0}
                className="addhabit__target"
                placeholder={`Target/day (${HABIT_UNITS.find((u) => u.key === unit)?.suffix || "…"})`}
              />
              {unit === "COUNT" && (
                <input name="unitLabel" className="addhabit__unitlabel" placeholder="unit label…" maxLength={20} autoComplete="off" />
              )}
            </>
          )}
        </div>
      )}
      {error && <p className="addhabit__error">{error}</p>}
    </form>
  );
}
