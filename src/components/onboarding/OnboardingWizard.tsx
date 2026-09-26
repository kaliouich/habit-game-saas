"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
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

export function OnboardingWizard({ aiConfigured }: { aiConfigured: boolean }) {
  const router = useRouter();
  const t = useTranslations("Onboarding");
  const [stack, setStack] = useState<ScreenId[]>(["choice"]);
  const [data, setData] = useState<WizardData>({});
  const [isCreating, setIsCreating] = useState(false);

  // Les libellés traduits eux-mêmes servent de valeur envoyée à l'IA (voir
  // lib/ai.ts) — Claude comprend directement le français/espagnol, et on lui
  // demande de répondre dans la même langue que l'input, donc pas besoin
  // d'une table de correspondance id -> texte anglais séparée. `plainLabel`
  // (sans emoji) est ce qui part réellement vers generateHabitsAction ;
  // `label` (avec emoji) n'est que pour l'affichage du bouton.
  const timeOptions = [
    { key: "tiny", label: t("time.tiny") },
    { key: "short", label: t("time.short") },
    { key: "medium", label: t("time.medium") },
    { key: "long", label: t("time.long") },
  ];

  const aiGoalOptions = [
    { key: "loseWeight", label: `🏋️ ${t("aiGoal.loseWeight")}`, plainLabel: t("aiGoal.loseWeight") },
    { key: "sleepBetter", label: `😴 ${t("aiGoal.sleepBetter")}`, plainLabel: t("aiGoal.sleepBetter") },
    { key: "quitBadHabit", label: `🚭 ${t("aiGoal.quitBadHabit")}`, plainLabel: t("aiGoal.quitBadHabit") },
    { key: "beatProcrastination", label: `📈 ${t("aiGoal.beatProcrastination")}`, plainLabel: t("aiGoal.beatProcrastination") },
    { key: "feelLessAnxious", label: `🧘 ${t("aiGoal.feelLessAnxious")}`, plainLabel: t("aiGoal.feelLessAnxious") },
    { key: "turnLifeAround", label: `🎯 ${t("aiGoal.turnLifeAround")}`, plainLabel: t("aiGoal.turnLifeAround") },
  ];

  const aiScopeOptions = [
    { key: "smallTweak", label: `🌱 ${t("aiScope.smallTweak")}`, plainLabel: t("aiScope.smallTweak") },
    { key: "newRoutine", label: `🏗️ ${t("aiScope.newRoutine")}`, plainLabel: t("aiScope.newRoutine") },
    { key: "fullReset", label: `🔄 ${t("aiScope.fullReset")}`, plainLabel: t("aiScope.fullReset") },
  ];

  const aiObstacleOptions = [
    { key: "noTime", label: `⏰ ${t("aiObstacle.noTime")}`, plainLabel: t("aiObstacle.noTime") },
    { key: "noMotivation", label: `🔋 ${t("aiObstacle.noMotivation")}`, plainLabel: t("aiObstacle.noMotivation") },
    { key: "forget", label: `🧠 ${t("aiObstacle.forget")}`, plainLabel: t("aiObstacle.forget") },
    { key: "unsure", label: `🤷 ${t("aiObstacle.unsure")}`, plainLabel: t("aiObstacle.unsure") },
  ];

  const aiErrorMessages: Record<string, string> = {
    AI_NOT_CONFIGURED: t("generating.errorNotConfigured"),
    RATE_LIMITED: t("generating.errorRateLimited"),
    AI_GENERATION_FAILED: t("generating.errorGeneric"),
  };

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
      setData((d) => ({ ...d, aiError: aiErrorMessages[res.error ?? ""] ?? t("generating.errorGeneric") }));
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
          <button type="button" className="onboardwizard__back" onClick={back} aria-label={t("back")}>
            {t("backArrow")}
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
            title={t("qFocus.title")}
            options={[
              { key: "fitness", label: `💪 ${t("qFocus.fitness")}` },
              { key: "mind", label: `🧘 ${t("qFocus.mind")}` },
              { key: "productivity", label: `🎯 ${t("qFocus.productivity")}` },
              { key: "quit", label: `🚭 ${t("qFocus.quit")}` },
              { key: "sleep", label: `😴 ${t("qFocus.sleep")}` },
              { key: "general", label: `✨ ${t("qFocus.general")}` },
            ]}
            onSelect={(key) => {
              setData((d) => ({ ...d, focus: key as FocusKey }));
              push("q-time");
            }}
          />
        )}

        {current === "q-time" && (
          <SingleChoiceScreen
            title={t("qTime.title")}
            options={timeOptions}
            onSelect={(key) => {
              setData((d) => ({ ...d, time: key as TimeBudgetKey }));
              push("q-energy");
            }}
          />
        )}

        {current === "q-energy" && (
          <SingleChoiceScreen
            title={t("qEnergy.title")}
            options={[
              { key: "morning", label: `🌅 ${t("qEnergy.morning")}` },
              { key: "day", label: `☀️ ${t("qEnergy.day")}` },
              { key: "evening", label: `🌆 ${t("qEnergy.evening")}` },
              { key: "varies", label: `🔀 ${t("qEnergy.varies")}` },
            ]}
            onSelect={(key) => {
              setData((d) => ({ ...d, energy: key as EnergyKey }));
              push("q-pick");
            }}
          />
        )}

        {current === "q-pick" && data.focus && data.time && (
          <MultiChoiceScreen
            title={t("qPick.title")}
            candidates={candidatesFor(data.focus, data.time)}
            onContinue={(selected) => {
              setData((d) => ({ ...d, drafts: selected, fromAi: false }));
              push("review");
            }}
          />
        )}

        {current === "ai-goal" && (
          <GoalScreen
            options={aiGoalOptions}
            onSelect={(key) => {
              setData((d) => ({ ...d, aiGoal: aiGoalOptions.find((o) => o.key === key)?.plainLabel ?? key }));
              push("ai-scope");
            }}
            onSkip={() => router.push("/app")}
          />
        )}

        {current === "ai-scope" && (
          <SingleChoiceScreen
            title={t("aiScope.title")}
            options={aiScopeOptions}
            onSelect={(key) => {
              setData((d) => ({ ...d, aiScope: aiScopeOptions.find((o) => o.key === key)?.plainLabel ?? key }));
              push("ai-obstacle");
            }}
          />
        )}

        {current === "ai-obstacle" && (
          <SingleChoiceScreen
            title={t("aiObstacle.title")}
            options={aiObstacleOptions}
            onSelect={(key) => {
              setData((d) => ({ ...d, aiObstacle: aiObstacleOptions.find((o) => o.key === key)?.plainLabel ?? key }));
              push("ai-time");
            }}
          />
        )}

        {current === "ai-time" && (
          <SingleChoiceScreen
            title={t("aiTime.title")}
            options={timeOptions}
            onSelect={(key) => {
              // L'IA reçoit le texte lisible ("Moins de 10 minutes"), pas la clé
              // courte interne ("tiny") — même logique que goal/scope/obstacle.
              const timeBudget = timeOptions.find((o) => o.key === key)?.label ?? key;
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
