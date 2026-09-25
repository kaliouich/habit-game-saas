"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createHabitsFromSelection, generateHabitsAction } from "@/lib/actions/onboarding";
import { candidatesFor, type EnergyKey, type FocusKey, type HabitDraft, type TimeBudgetKey } from "@/lib/onboardingCatalog";
import { ChoiceScreen } from "./screens/ChoiceScreen";
import { SingleChoiceScreen } from "./screens/SingleChoiceScreen";
import { MultiChoiceScreen } from "./screens/MultiChoiceScreen";
import { GoalScreen } from "./screens/GoalScreen";
import { GeneratingScreen } from "./screens/GeneratingScreen";
import { ReviewScreen } from "./screens/ReviewScreen";

type ScreenId =
  | "choice"
  | "q-focus"
  | "q-time"
  | "q-energy"
  | "q-pick"
  | "ai-goal"
  | "ai-scope"
  | "ai-obstacle"
  | "ai-time"
  | "ai-generating"
  | "review";

interface WizardData {
  focus?: FocusKey;
  time?: TimeBudgetKey;
  energy?: EnergyKey;
  fromAi?: boolean;
  drafts?: HabitDraft[];
  milestone?: string;
  aiGoal?: string;
  aiScope?: string;
  aiObstacle?: string;
  aiTime?: string;
  aiError?: string;
}

const AI_ERROR_MESSAGES: Record<string, string> = {
  AI_NOT_CONFIGURED: "AI suggestions aren't available right now — try the questionnaire instead.",
  RATE_LIMITED: "You've hit the hourly limit for AI suggestions. Try again in a bit, or use the questionnaire.",
  AI_GENERATION_FAILED: "Something went wrong generating your habits. Please try again.",
};

// Mêmes libellés que le chemin questionnaire (q-time) — cohérence visuelle,
// et le modèle reçoit le même vocabulaire de budget-temps des deux côtés.
const TIME_OPTIONS = [
  { key: "Under 10 minutes", label: "Under 10 minutes" },
  { key: "10–30 minutes", label: "10–30 minutes" },
  { key: "30–60 minutes", label: "30–60 minutes" },
  { key: "1 hour or more", label: "1 hour or more" },
];

export function OnboardingWizard({ aiConfigured }: { aiConfigured: boolean }) {
  const router = useRouter();
  const [stack, setStack] = useState<ScreenId[]>(["choice"]);
  const [data, setData] = useState<WizardData>({});
  const [isCreating, setIsCreating] = useState(false);

  const current = stack[stack.length - 1];

  function push(screen: ScreenId) {
    setStack((s) => [...s, screen]);
  }
  function replaceTop(screen: ScreenId) {
    setStack((s) => [...s.slice(0, -1), screen]);
  }
  function back() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  async function runGeneration(input: { goal: string; scope: string; obstacle: string; timeBudget: string }) {
    setData((d) => ({ ...d, aiError: undefined }));
    push("ai-generating");
    const res = await generateHabitsAction(input);
    if (res.ok && res.habits) {
      setData((d) => ({ ...d, drafts: res.habits, milestone: res.milestone, fromAi: true }));
      replaceTop("review");
    } else {
      setData((d) => ({ ...d, aiError: AI_ERROR_MESSAGES[res.error ?? ""] ?? "Something went wrong. Please try again." }));
    }
  }

  async function handleCreate(selected: HabitDraft[]) {
    setIsCreating(true);
    const res = await createHabitsFromSelection(selected);
    setIsCreating(false);
    if (res.ok) {
      router.push("/app");
    }
    return res;
  }

  return (
    <div className="onboardwizard">
      <div className="onboardwizard__card">
        {stack.length > 1 && current !== "review" && current !== "ai-generating" && (
          <button type="button" className="onboardwizard__back" onClick={back} aria-label="Back">
            ← Back
          </button>
        )}

        {current === "choice" && (
          <ChoiceScreen
            aiConfigured={aiConfigured}
            onQuestionnaire={() => push("q-focus")}
            onAi={() => push("ai-goal")}
          />
        )}

        {current === "q-focus" && (
          <SingleChoiceScreen
            title="What's your main focus right now?"
            options={[
              { key: "fitness", label: "💪 Health & Fitness" },
              { key: "mind", label: "🧘 Mind & Focus" },
              { key: "productivity", label: "🎯 Productivity" },
              { key: "quit", label: "🚭 Breaking a habit" },
              { key: "sleep", label: "😴 Sleep & Energy" },
              { key: "general", label: "✨ General self-improvement" },
            ]}
            onSelect={(key) => {
              setData((d) => ({ ...d, focus: key as FocusKey }));
              push("q-time");
            }}
          />
        )}

        {current === "q-time" && (
          <SingleChoiceScreen
            title="How much time can you realistically give each day?"
            options={[
              { key: "tiny", label: "Under 10 minutes" },
              { key: "short", label: "10–30 minutes" },
              { key: "medium", label: "30–60 minutes" },
              { key: "long", label: "1 hour or more" },
            ]}
            onSelect={(key) => {
              setData((d) => ({ ...d, time: key as TimeBudgetKey }));
              push("q-energy");
            }}
          />
        )}

        {current === "q-energy" && (
          <SingleChoiceScreen
            title="When do you have the most energy?"
            options={[
              { key: "morning", label: "🌅 Early morning" },
              { key: "day", label: "☀️ During the day" },
              { key: "evening", label: "🌆 Evening" },
              { key: "varies", label: "🔀 It varies" },
            ]}
            onSelect={(key) => {
              setData((d) => ({ ...d, energy: key as EnergyKey }));
              push("q-pick");
            }}
          />
        )}

        {current === "q-pick" && data.focus && data.time && (
          <MultiChoiceScreen
            title="Pick a few things you'd like to work on"
            candidates={candidatesFor(data.focus, data.time)}
            onContinue={(selected) => {
              setData((d) => ({ ...d, drafts: selected, fromAi: false }));
              push("review");
            }}
          />
        )}

        {current === "ai-goal" && (
          <GoalScreen
            options={[
              { key: "Lose weight / get fit", label: "🏋️ Lose weight / get fit" },
              { key: "Sleep better", label: "😴 Sleep better" },
              { key: "Quit a bad habit", label: "🚭 Quit a bad habit" },
              { key: "Beat procrastination", label: "📈 Beat procrastination" },
              { key: "Feel less anxious or stressed", label: "🧘 Feel less anxious or stressed" },
              { key: "Turn my life around", label: "🎯 Turn my life around" },
            ]}
            onSelect={(goal) => {
              setData((d) => ({ ...d, aiGoal: goal }));
              push("ai-scope");
            }}
            onSkip={() => router.push("/app")}
          />
        )}

        {current === "ai-scope" && (
          <SingleChoiceScreen
            title="How big a swing are you making?"
            options={[
              { key: "Small tweak — one thing, done consistently", label: "🌱 Small tweak — one thing, done consistently" },
              { key: "New routine — a few habits working together", label: "🏗️ New routine — a few habits working together" },
              { key: "Full reset — I want to rebuild from scratch", label: "🔄 Full reset — I want to rebuild from scratch" },
            ]}
            onSelect={(scope) => {
              setData((d) => ({ ...d, aiScope: scope }));
              push("ai-obstacle");
            }}
          />
        )}

        {current === "ai-obstacle" && (
          <SingleChoiceScreen
            title="What usually gets in the way?"
            options={[
              { key: "No time", label: "⏰ No time" },
              { key: "No motivation once the day starts", label: "🔋 No motivation once the day starts" },
              { key: "I just forget", label: "🧠 I just forget" },
              { key: "I don't know where to start", label: "🤷 I don't know where to start" },
            ]}
            onSelect={(obstacle) => {
              setData((d) => ({ ...d, aiObstacle: obstacle }));
              push("ai-time");
            }}
          />
        )}

        {current === "ai-time" && (
          <SingleChoiceScreen
            title="How much time can you give it, daily?"
            options={TIME_OPTIONS}
            onSelect={(timeBudget) => {
              setData((d) => ({ ...d, aiTime: timeBudget }));
              if (data.aiGoal && data.aiScope && data.aiObstacle) {
                void runGeneration({ goal: data.aiGoal, scope: data.aiScope, obstacle: data.aiObstacle, timeBudget });
              }
            }}
          />
        )}

        {current === "ai-generating" && (
          <GeneratingScreen
            status={data.aiError ? "error" : "loading"}
            errorMessage={data.aiError}
            onRetry={() => {
              if (data.aiGoal && data.aiScope && data.aiObstacle && data.aiTime) {
                void runGeneration({ goal: data.aiGoal, scope: data.aiScope, obstacle: data.aiObstacle, timeBudget: data.aiTime });
              }
            }}
            onBack={back}
          />
        )}

        {current === "review" && data.drafts && (
          <ReviewScreen
            drafts={data.drafts}
            fromAi={!!data.fromAi}
            milestone={data.milestone}
            isCreating={isCreating}
            onBack={back}
            onCreate={handleCreate}
          />
        )}
      </div>
    </div>
  );
}
