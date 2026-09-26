"use client";

import { useTranslations } from "next-intl";

interface ChoiceScreenProps {
  aiConfigured: boolean;
  onQuestionnaire: () => void;
  onAi: () => void;
}

export function ChoiceScreen({ aiConfigured, onQuestionnaire, onAi }: ChoiceScreenProps) {
  const t = useTranslations("Onboarding.choice");

  return (
    <div className="onboardscreen">
      <h1 className="onboardscreen__title">{t("title")}</h1>
      <p className="onboardscreen__subtitle">{t("subtitle")}</p>

      <div className="onboardchoice">
        <button type="button" className="onboardchoice__card" onClick={onQuestionnaire}>
          <span className="onboardchoice__emoji">📋</span>
          <span className="onboardchoice__label">{t("questionnaireLabel")}</span>
          <span className="onboardchoice__desc">{t("questionnaireDesc")}</span>
        </button>

        {aiConfigured && (
          <button type="button" className="onboardchoice__card" onClick={onAi}>
            <span className="onboardchoice__emoji">✨</span>
            <span className="onboardchoice__label">{t("aiLabel")}</span>
            <span className="onboardchoice__desc">{t("aiDesc")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
