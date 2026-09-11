"use client";

interface Option {
  key: string;
  label: string;
}

interface SingleChoiceScreenProps {
  title: string;
  options: Option[];
  onSelect: (key: string) => void;
}

/** Réutilisé pour q-focus / q-time / q-energy — clic = avance direct, pas de Continue. */
export function SingleChoiceScreen({ title, options, onSelect }: SingleChoiceScreenProps) {
  return (
    <div className="onboardscreen">
      <h1 className="onboardscreen__title">{title}</h1>

      <div className="onboardoptions">
        {options.map((opt) => (
          <button key={opt.key} type="button" className="onboardoptions__item" onClick={() => onSelect(opt.key)}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
