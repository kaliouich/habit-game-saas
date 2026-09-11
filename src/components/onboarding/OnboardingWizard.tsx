"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createHabitsFromSelection } from "@/lib/actions/onboarding";
import { candidatesFor, type EnergyKey, type FocusKey, type HabitDraft, type TimeBudgetKey } from "@/lib/onboardingCatalog";
import { ChoiceScreen } from "./screens/ChoiceScreen";
import { SingleChoiceScreen } from "./screens/SingleChoiceScreen";
import { MultiChoiceScreen } from "./screens/MultiChoiceScreen";
import { AiPromptScreen } from "./screens/AiPromptScreen";
import { ReviewScreen } from "./screens/ReviewScreen";

type ScreenId = "choice" | "q-focus" | "q-time" | "q-energy" | "q-pick" | "ai-prompt" | "review";

interface WizardData {
  focus?: FocusKey;
  time?: TimeBudgetKey;
  energy?: EnergyKey;
  fromAi?: boolean;
  drafts?: HabitDraft[];
}

export function OnboardingWizard({ aiConfigured }: { aiConfigured: boolean }) {
  const router = useRouter();
  const [stack, setStack] = useState<ScreenId[]>(["choice"]);
  const [data, setData] = useState<WizardData>({});
  const [isCreating, setIsCreating] = useState(false);

  const current = stack[stack.length - 1];

  function push(screen: ScreenId) {
    setStack((s) => [...s, screen]);
  }
  function back() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
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
        {stack.length > 1 && current !== "review" && (
          <button type="button" className="onboardwizard__back" onClick={back} aria-label="Back">
            ← Back
          </button>
        )}

        {current === "choice" && (
          <ChoiceScreen
            aiConfigured={aiConfigured}
            onQuestionnaire={() => push("q-focus")}
            onAi={() => push("ai-prompt")}
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

        {current === "ai-prompt" && (
          <AiPromptScreen
            onGenerated={(drafts) => {
              setData((d) => ({ ...d, drafts, fromAi: true }));
              push("review");
            }}
          />
        )}

        {current === "review" && data.drafts && (
          <ReviewScreen drafts={data.drafts} fromAi={!!data.fromAi} isCreating={isCreating} onBack={back} onCreate={handleCreate} />
        )}
      </div>
    </div>
  );
}
