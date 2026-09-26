"use client";

import { useTranslations } from "next-intl";

interface GeneratingScreenProps {
  status: "loading" | "error";
  errorMessage?: string;
  onRetry: () => void;
  onBack: () => void;
}

/** Écran-pont pendant l'appel Claude (déclenché par OnboardingWizard au
 *  montage de cet écran) — le sondage tap-only n'a plus d'écran "Generate"
 *  dédié comme l'ancien AiPromptScreen, donc l'attente a besoin du sien. */
export function GeneratingScreen({ status, errorMessage, onRetry, onBack }: GeneratingScreenProps) {
  const t = useTranslations("Onboarding.generating");

  if (status === "loading") {
    return (
      <div className="onboardscreen onboardscreen--center">
        <div className="generating__spinner" aria-hidden />
        <h1 className="onboardscreen__title">{t("title")}</h1>
        <p className="onboardscreen__subtitle">{t("subtitle")}</p>
      </div>
    );
  }

  return (
    <div className="onboardscreen">
      <h1 className="onboardscreen__title">{t("errorTitle")}</h1>
      <p className="onboardprompt__error">{errorMessage}</p>
      <button type="button" className="btn btn--primary" onClick={onRetry}>
        {t("retry")}
      </button>
      <button type="button" className="btn btn--secondary" onClick={onBack}>
        {t("back")}
      </button>
    </div>
  );
}
