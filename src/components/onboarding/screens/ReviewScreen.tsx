"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { HabitDraft } from "@/lib/onboardingCatalog";

interface ReviewScreenProps {
  drafts: HabitDraft[];
  fromAi: boolean;
  milestone?: string;
  isCreating: boolean;
  onBack: () => void;
  onCreate: (selected: HabitDraft[]) => Promise<{ ok: boolean; created: number; error?: string }>;
}

export function ReviewScreen({ drafts, fromAi, milestone, isCreating, onBack, onCreate }: ReviewScreenProps) {
  const t = useTranslations("Onboarding.review");
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
      setError(res.error ?? t("createError"));
    }
  }

  return (
    <div className="onboardscreen">
      <h1 className="onboardscreen__title">{t("title")}</h1>
      <p className="onboardscreen__subtitle">{t("subtitle")}</p>

      {fromAi && milestone && (
        <div className="onboardreview__quest">
          <span className="onboardreview__questlabel">{t("questLabel")}</span>
          <p className="onboardreview__questtext">{milestone}</p>
        </div>
      )}

      {fromAi && <p className="onboardreview__disclaimer">{t("disclaimer")}</p>}

      <div className="onboardreview__list">
        {items.length === 0 && <p className="onboardreview__empty">{t("empty")}</p>}
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
            <button type="button" className="onboardreview__remove" onClick={() => remove(i)} aria-label={t("remove")}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {error && <p className="onboardprompt__error">{error}</p>}

      <div className="onboardreview__actions">
        <button type="button" className="btn btn--secondary" onClick={onBack} disabled={isCreating}>
          {t("back")}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleCreate}
          disabled={items.length === 0 || isCreating}
        >
          {isCreating ? t("creating") : t("create", { count: items.length })}
        </button>
      </div>
    </div>
  );
}
