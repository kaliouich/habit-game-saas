"use client";

import { useOptimistic, useTransition } from "react";
import { setMood } from "@/lib/actions/moods";
import { MOODS, MOTIVATIONS } from "@/lib/config";

interface MoodCellProps {
  date: string;
  value: number | null;
  disabled: boolean;
  /** V10 = mood ; motivation ajoutée ensuite, même mécanique, échelle distincte. */
  field?: "value" | "motivation";
}

/** V10 : sélecteur d'humeur (ou de motivation) par jour sous la grille. */
export function MoodCell({ date, value, disabled, field = "value" }: MoodCellProps) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(value);
  const scale = field === "motivation" ? MOTIVATIONS : MOODS;

  if (disabled) return <span className="mood mood--future" aria-hidden />;

  const current = scale.find((m) => m.value === optimistic);

  return (
    <select
      className="mood"
      value={optimistic ?? ""}
      aria-label={`${field === "motivation" ? "Motivation" : "Mood"} ${date}`}
      title={current?.label ?? (field === "motivation" ? "Motivation" : "Mood")}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (!v) return;
        startTransition(async () => {
          setOptimistic(v);
          try {
            await setMood({ date, field, value: v });
          } catch {
            /* revalidate ramène l'état serveur */
          }
        });
      }}
    >
      <option value="" disabled>
        –
      </option>
      {scale.map((m) => (
        <option key={m.value} value={m.value}>
          {m.emoji}
        </option>
      ))}
    </select>
  );
}
