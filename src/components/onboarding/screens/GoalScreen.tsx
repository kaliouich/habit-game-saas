"use client";

interface Option {
  key: string;
  label: string;
}

interface GoalScreenProps {
  options: Option[];
  onSelect: (key: string) => void;
  onSkip: () => void;
}

/** Premier écran du chemin IA — plus de texte libre (page blanche = friction,
 *  et le modèle recevait un signal trop faible pour bien cibler les
 *  habitudes). Choix parmi une liste courte, plus une sortie explicite pour
 *  qui sait déjà ce qu'il veut : "I'll build my own habits" saute tout le
 *  reste du sondage et va droit au dashboard (onSkip), pas juste un retour
 *  à l'écran de choix — voir OnboardingWizard. */
export function GoalScreen({ options, onSelect, onSkip }: GoalScreenProps) {
  return (
    <div className="onboardscreen">
      <h1 className="onboardscreen__title">What&apos;s the goal?</h1>
      <p className="onboardscreen__subtitle">Pick what&apos;s closest — you can adjust the habits after.</p>

      <div className="onboardoptions">
        {options.map((opt) => (
          <button key={opt.key} type="button" className="onboardoptions__item" onClick={() => onSelect(opt.key)}>
            {opt.label}
          </button>
        ))}
      </div>

      <button type="button" className="goalscreen__skip" onClick={onSkip}>
        ✍️ I&apos;ll build my own habits →
      </button>
    </div>
  );
}
