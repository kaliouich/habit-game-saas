"use client";

import { useState } from "react";
import type { HabitDraft } from "@/lib/onboardingCatalog";

interface ReviewScreenProps {
  drafts: HabitDraft[];
  fromAi: boolean;
  isCreating: boolean;
  onBack: () => void;
  onCreate: (selected: HabitDraft[]) => Promise<{ ok: boolean; created: number; error?: string }>;
}

export function ReviewScreen({ drafts, fromAi, isCreating, onBack, onCreate }: ReviewScreenProps) {
  const [items, setItems] = useState(drafts);
  const [error, setError] = useState<string | null>(null);

  function remove(i: number) {
    setItems((list) => list.filter((_, idx) => idx !== i));
  }

  function rename(i: number, name: string) {
    setItems((list) => list.map((d, idx) => (idx === i ? { ...d, name } : d)));
  }

  async function handleCreate() {
    setError(null);
    const res = await onCreate(items);
    if (!res.ok) {
      setError(res.error ?? "Couldn't create your habits. Please try again.");
    }
  }

  return (
    <div className="onboardscreen">
      <h1 className="onboardscreen__title">Here&apos;s your starting list</h1>
      <p className="onboardscreen__subtitle">Review, tweak the names, or remove anything that doesn&apos;t fit.</p>

      {fromAi && (
        <p className="onboardreview__disclaimer">
          General wellness suggestions, not medical advice — if you&apos;re struggling, please also talk to a
          professional.
        </p>
      )}

      <div className="onboardreview__list">
        {items.length === 0 && <p className="onboardreview__empty">Nothing left to add — go back and pick something.</p>}
        {items.map((draft, i) => (
          <div key={i} className="onboardreview__item">
            <span className="onboardreview__emoji">{draft.emoji}</span>
            <div className="onboardreview__info">
              <input
                className="onboardreview__name"
                value={draft.name}
                onChange={(e) => rename(i, e.target.value)}
                maxLength={40}
              />
              {draft.rationale && <span className="onboardreview__rationale">{draft.rationale}</span>}
            </div>
            <button type="button" className="onboardreview__remove" onClick={() => remove(i)} aria-label="Remove">
              ✕
            </button>
          </div>
        ))}
      </div>

      {error && <p className="onboardprompt__error">{error}</p>}

      <div className="onboardreview__actions">
        <button type="button" className="btn btn--secondary" onClick={onBack} disabled={isCreating}>
          Back
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleCreate}
          disabled={items.length === 0 || isCreating}
        >
          {isCreating ? "Creating…" : `Create ${items.length} habit${items.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
