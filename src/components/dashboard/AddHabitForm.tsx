"use client";

import { useRef, useState, useTransition } from "react";
import { createHabit } from "@/lib/actions/habits";

/** V2 : ajout inline dans la sidebar, comme une nouvelle ligne du tableur. */
export function AddHabitForm({ canAdd, limit }: { canAdd: boolean; limit: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canAdd) {
    return <p className="sidebar__limit">Limite de {limit} habitudes atteinte</p>;
  }

  return (
    <form
      ref={formRef}
      className="addhabit"
      action={(formData: FormData) => {
        const name = String(formData.get("name") ?? "").trim();
        const emoji = String(formData.get("emoji") ?? "").trim();
        const type = formData.get("type") === "QUIT" ? "QUIT" : "BUILD";
        if (!name) return;
        startTransition(async () => {
          const res = await createHabit({ name, emoji: emoji || undefined, type });
          if (res.ok) {
            formRef.current?.reset();
            setError(null);
          } else {
            setError(res.error ?? "Erreur");
          }
        });
      }}
    >
      <input name="emoji" className="addhabit__emoji" placeholder="✨" maxLength={8} autoComplete="off" />
      <input name="name" className="addhabit__name" placeholder="New habit…" maxLength={40} required autoComplete="off" />
      <select name="type" className="addhabit__type" defaultValue="BUILD" title="Build = à faire · Quit = à éviter">
        <option value="BUILD">Build</option>
        <option value="QUIT">Quit</option>
      </select>
      <button type="submit" className="addhabit__submit" disabled={isPending} aria-label="Add habit">
        +
      </button>
      {error && <p className="addhabit__error">{error}</p>}
    </form>
  );
}
