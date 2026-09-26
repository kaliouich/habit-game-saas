import { getTranslations } from "next-intl/server";
import type { HabitUnit } from "@/lib/stats";
import type { ISODate } from "@/lib/dates";
import { habitUnitConfig } from "@/lib/config";
import { DayCheckbox } from "./DayCheckbox";
import { DayValueCell } from "./DayValueCell";

interface TodayHabit {
  id: string;
  name: string;
  emoji: string | null;
  loggedDates: Set<ISODate>;
  unit?: HabitUnit;
  targetValue?: number | null;
  unitLabel?: string | null;
  logValues?: Map<ISODate, number>;
}

interface TodayPanelProps {
  habits: TodayHabit[];
  today: ISODate;
}

/** Le tableur mensuel (.gridwrap) reste la vue signature du produit, mais sur
 *  un écran de téléphone c'est une table qui défile horizontalement sans
 *  indice visuel de scroll — mauvaise première interaction quotidienne. Ce
 *  panneau met le geste du jour (une ligne, un tap) tout en haut, avant même
 *  le graphique, sans dupliquer la logique de coche : mêmes DayCheckbox /
 *  DayValueCell que la grille, juste réarrangés en liste verticale. */
export async function TodayPanel({ habits, today }: TodayPanelProps) {
  const t = await getTranslations("Dashboard");
  return (
    <div className="panel todaypanel">
      <h2 className="panel__title">{t("today")}</h2>
      <ul className="todaypanel__list">
        {habits.map((h) => {
          const isQuantified = h.unit && h.unit !== "TIMES";
          const unit = isQuantified ? habitUnitConfig(h.unit!) : null;
          const value = h.logValues?.get(today) ?? 0;
          const target = h.targetValue ?? 1;
          return (
            <li key={h.id} className="todaypanel__row">
              <span className="todaypanel__name">
                {h.emoji} {h.name}
                {isQuantified && (
                  <span className="todaypanel__target">
                    {value}/{target}
                    {unit && unit.key === "COUNT" && h.unitLabel ? ` ${h.unitLabel}` : unit?.suffix ? ` ${unit.suffix}` : ""}
                  </span>
                )}
              </span>
              {!h.unit || h.unit === "TIMES" ? (
                <DayCheckbox habitId={h.id} date={today} checked={h.loggedDates.has(today)} disabled={false} />
              ) : (
                <DayValueCell
                  habitId={h.id}
                  date={today}
                  value={value}
                  target={target}
                  unit={h.unit}
                  disabled={false}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
