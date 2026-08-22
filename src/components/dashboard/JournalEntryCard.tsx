"use client";

import { useState, useTransition } from "react";
import { deleteJournalEntry, updateJournalEntry } from "@/lib/actions/journal";
import type { JournalBlock } from "@/lib/journal";
import { JournalEntryView } from "./JournalEntryView";

interface JournalEntryCardProps {
  id: string;
  date: string;
  timeLabel: string;
  title: string | null;
  content: JournalBlock[];
  markdown: string; // blocksToMarkdown(content), calculé côté serveur — préremplit l'édition
  habitName: string | null;
  habitEmoji: string | null;
}

/** Phase 3 roadmap. Vue par défaut = JournalEntryView (arbre structuré, jamais
 *  de HTML) ; le mode édition ré-parse un textarea markdown côté serveur
 *  (updateJournalEntry) — le client ne construit jamais l'arbre lui-même. */
export function JournalEntryCard({ id, date, timeLabel, title, content, markdown, habitName, habitEmoji }: JournalEntryCardProps) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <article className="journalentry">
      <header className="journalentry__head">
        <div className="journalentry__meta">
          {title && <span className="journalentry__title">{title}</span>}
          <span className="journalentry__date">
            {date}, {timeLabel}
          </span>
          {habitName && (
            <span className="journalentry__habit">
              {habitEmoji} {habitName}
            </span>
          )}
        </div>
        <div className="journalentry__actions">
          <button type="button" onClick={() => setEditing((v) => !v)} disabled={isPending}>
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            type="button"
            className="journalentry__delete"
            disabled={isPending}
            onClick={() => {
              if (!confirm("Delete this journal entry?")) return;
              startTransition(async () => {
                await deleteJournalEntry({ entryId: id });
              });
            }}
          >
            Delete
          </button>
        </div>
      </header>

      {editing ? (
        <form
          className="journalentry__editform"
          action={(formData: FormData) => {
            const newTitle = String(formData.get("title") ?? "").trim();
            const newMarkdown = String(formData.get("markdown") ?? "").trim();
            if (!newMarkdown) return;
            setError(null);
            startTransition(async () => {
              const res = await updateJournalEntry({ entryId: id, title: newTitle || undefined, markdown: newMarkdown });
              if (res.ok) setEditing(false);
              else setError(res.error === "PRO_REQUIRED" ? "Pro required" : "Error");
            });
          }}
        >
          <input name="title" defaultValue={title ?? ""} maxLength={80} placeholder="Title (optional)" />
          <textarea name="markdown" defaultValue={markdown} rows={4} maxLength={4000} required />
          <button type="submit" disabled={isPending}>
            Save
          </button>
          {error && <p className="journalentry__error">{error}</p>}
        </form>
      ) : (
        <JournalEntryView blocks={content} />
      )}
    </article>
  );
}
