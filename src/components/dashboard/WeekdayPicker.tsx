"use client";

import { useLocale, useTranslations } from "next-intl";

/** Lundi → dimanche, valeurs getUTCDay (0 = dimanche). */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

interface WeekdayPickerProps {
  /** Jours prévus (0=dim..6=sam). Vide ou 7 jours = tous les jours. */
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}

/** Sept pastilles lundi→dimanche. Initiales et noms viennent d'Intl (1er janvier
 *  2024 = lundi) : aucune chaîne par langue à maintenir. */
export function WeekdayPicker({ value, onChange, disabled }: WeekdayPickerProps) {
  const locale = useLocale();
  const t = useTranslations("Dashboard.schedule");
  const narrow = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  const long = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  const everyDay = value.length === 0 || value.length === 7;

  return (
    <div className="weekdays" role="group" aria-label={t("label")}>
      <div className="weekdays__row">
        {ORDER.map((dow) => {
          const date = new Date(Date.UTC(2024, 0, 1 + ((dow + 6) % 7)));
          const on = everyDay || value.includes(dow);
          return (
            <button
              key={dow}
              type="button"
              className={on ? "weekdays__day weekdays__day--on" : "weekdays__day"}
              aria-pressed={on}
              title={long.format(date)}
              disabled={disabled}
              onClick={() => {
                const base = everyDay ? [...ORDER] : value;
                const next = base.includes(dow) ? base.filter((d) => d !== dow) : [...base, dow];
                // Dernier jour décoché : on garde au moins un jour prévu.
                onChange(next.length === 0 ? [dow] : next);
              }}
            >
              {narrow.format(date)}
            </button>
          );
        })}
      </div>
      <p className="weekdays__hint">{everyDay ? t("everyDay") : t("someDays", { count: value.length })}</p>
    </div>
  );
}
