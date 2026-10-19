"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { setDayStartHour } from "@/lib/actions/settings";

const HOURS = [0, 1, 2, 3, 4, 5, 6];

/** Heure de bascule de la journée — pour ceux qui cochent encore leurs habitudes
 *  à 1h du matin et veulent que ça compte pour la veille. */
export function DayStartPicker({ current }: { current: number }) {
  const t = useTranslations("Dashboard.dayStart");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="daystart">
      <label className="daystart__label" htmlFor="daystart-select">
        {t("label")}
      </label>
      <select
        id="daystart-select"
        className="daystart__select"
        value={current}
        disabled={isPending}
        onChange={(e) => {
          const hour = Number(e.target.value);
          startTransition(async () => {
            await setDayStartHour({ hour });
          });
        }}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}:00
          </option>
        ))}
      </select>
      <p className="daystart__hint">{t("hint")}</p>
    </div>
  );
}
