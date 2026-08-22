"use client";

import { useRef, useState, useTransition } from "react";
import { createJournalEntry } from "@/lib/actions/journal";

interface JournalFormProps {
  today: string;
  habits: { id: string; name: string; emoji: string | null }[];
}

/** Phase 3 roadmap — formulaire d'ajout, syntaxe markdown minimale (voir lib/journal.ts). */
export function JournalForm({ today, habits }: JournalFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      className="journalform"
      action={(formData: FormData) => {
        const markdown = String(formData.get("markdown") ?? "").trim();
        const title = String(formData.get("title") ?? "").trim();
        const habitId = String(formData.get("habitId") ?? "");
        const date = String(formData.get("date") ?? today);
        if (!markdown) return;
        setError(null);
        startTransition(async () => {
          const res = await createJournalEntry({
            date,
            habitId: habitId || undefined,
            title: title || undefined,
            markdown,
          });
          if (res.ok) {
            formRef.current?.reset();
          } else {
            setError(res.error === "PRO_REQUIRED" ? "Pro required" : "Error");
          }
        });
      }}
    >
      <div className="journalform__row">
        <input type="date" name="date" defaultValue={today} max={today} required />
        <select name="habitId" defaultValue="">
          <option value="">No habit</option>
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.emoji} {h.name}
            </option>
          ))}
        </select>
      </div>
      <input name="title" placeholder="Title (optional)" maxLength={80} />
      <textarea
        name="markdown"
        placeholder="What's on your mind? **bold**, *italic*, ~~strike~~, - bullet, - [ ] checklist"
        rows={4}
        maxLength={4000}
        required
      />
      <button type="submit" disabled={isPending}>
        Add entry
      </button>
      {error && <p className="journalform__error">{error}</p>}
    </form>
  );
}
