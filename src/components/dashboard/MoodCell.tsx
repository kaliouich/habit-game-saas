"use client";

import { useOptimistic, useTransition } from "react";
import { setMood } from "@/lib/actions/moods";
import { MOODS } from "@/lib/config";

interface MoodCellProps {
  date: string;
  value: number | null;
  disabled: boolean;
}

/** V10 : sélecteur d'humeur par jour sous la grille. */
export function MoodCell({ date, value, disabled }: MoodCellProps) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(value);

  if (disabled) return <span className="mood mood--future" aria-hidden />;

  const current = MOODS.find((m) => m.value === optimistic);

  return (
    <select
      className="mood"
      value={optimistic ?? ""}
      aria-label={`Mood ${date}`}
      title={current?.label ?? "Mood"}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (!v) return;
        startTransition(async () => {
          setOptimistic(v);
          try {
            await setMood({ date, value: v });
          } catch {
            /* revalidate ramène l'état serveur */
          }
        });
      }}
    >
      <option value="" disabled>
        –
      </option>
      {MOODS.map((m) => (
        <option key={m.value} value={m.value}>
          {m.emoji}
        </option>
      ))}
    </select>
  );
}
