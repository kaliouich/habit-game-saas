"use client";

import { useState } from "react";
import { generateHabitsAction } from "@/lib/actions/onboarding";
import type { HabitDraft } from "@/lib/onboardingCatalog";

const EXAMPLES = [
  "lose weight and feel stronger",
  "get out of my depression",
  "fix my life, I feel stuck",
  "quit smoking for good",
  "become a morning person",
  "be less anxious and more present",
];

const ERROR_MESSAGES: Record<string, string> = {
  AI_NOT_CONFIGURED: "AI suggestions aren't available right now — try the questionnaire instead.",
  RATE_LIMITED: "You've hit the hourly limit for AI suggestions. Try again in a bit, or use the questionnaire.",
  AI_GENERATION_FAILED: "Something went wrong generating your habits. Please try again.",
};

interface AiPromptScreenProps {
  onGenerated: (drafts: HabitDraft[]) => void;
}

export function AiPromptScreen({ onGenerated }: AiPromptScreenProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholder] = useState(() => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setIsLoading(true);
    setError(null);
    const res = await generateHabitsAction(trimmed);
    setIsLoading(false);
    if (res.ok && res.habits) {
      onGenerated(res.habits);
    } else {
      setError(ERROR_MESSAGES[res.error ?? ""] ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="onboardscreen">
      <h1 className="onboardscreen__title">What do you want to work on?</h1>
      <p className="onboardscreen__subtitle">
        Be as specific or as vague as you like — e.g. &ldquo;{placeholder}&rdquo;
      </p>

      <textarea
        className="onboardprompt__textarea"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 300))}
        placeholder={`e.g. "${placeholder}"`}
        rows={4}
        maxLength={300}
        disabled={isLoading}
        autoFocus
      />
      <div className="onboardprompt__count">{text.length}/300</div>

      {error && <p className="onboardprompt__error">{error}</p>}

      <button type="button" className="btn btn--primary" onClick={submit} disabled={!text.trim() || isLoading}>
        {isLoading ? "Generating…" : "Generate my habits ✨"}
      </button>
    </div>
  );
}
