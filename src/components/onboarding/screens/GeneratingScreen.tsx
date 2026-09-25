"use client";

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
  if (status === "loading") {
    return (
      <div className="onboardscreen onboardscreen--center">
        <div className="generating__spinner" aria-hidden />
        <h1 className="onboardscreen__title">Building your quest…</h1>
        <p className="onboardscreen__subtitle">Turning your answers into a 30-day plan.</p>
      </div>
    );
  }

  return (
    <div className="onboardscreen">
      <h1 className="onboardscreen__title">Something went wrong</h1>
      <p className="onboardprompt__error">{errorMessage}</p>
      <button type="button" className="btn btn--primary" onClick={onRetry}>
        Try again
      </button>
      <button type="button" className="btn btn--secondary" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
