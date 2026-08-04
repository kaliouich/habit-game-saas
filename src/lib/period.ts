/**
 * Sélection de période du rapport (Sprint 7). Pur, testable : c'est aussi ici
 * que passe la limite de plan, donc le comportement doit être verrouillé.
 */
import { pad2, type ISODate } from "./dates";

export type PeriodKey = "month" | "30d" | "90d" | "year" | "custom";

export const PERIOD_PRESETS: { key: PeriodKey; label: string; proOnly: boolean }[] = [
  { key: "month", label: "This month", proOnly: false },
  { key: "30d", label: "Last 30 days", proOnly: true },
  { key: "90d", label: "Last 90 days", proOnly: true },
  { key: "year", label: "This year", proOnly: true },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDays(date: ISODate, delta: number): ISODate {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

export interface ResolvedPeriod {
  from: ISODate;
  to: ISODate;
  key: PeriodKey;
  label: string;
  /** true si la demande a été ramenée au mois courant faute de plan Pro. */
  clamped: boolean;
}

/**
 * Résout la période demandée en bornes concrètes, en appliquant le plan.
 * FREE est ramené au mois courant — même règle que `canViewMonth` pour le
 * dashboard, appliquée ici aussi pour que le rapport ne devienne pas une porte
 * dérobée vers l'historique.
 */
export function resolvePeriod(
  input: { period?: string; from?: string; to?: string },
  today: ISODate,
  plan: "FREE" | "PRO",
): ResolvedPeriod {
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthPeriod: ResolvedPeriod = {
    from: monthStart,
    to: today,
    key: "month",
    label: "This month",
    clamped: false,
  };

  const requested = (input.period ?? "month") as PeriodKey;

  if (plan !== "PRO") {
    // Toute demande au-delà du mois courant est ramenée, en le signalant.
    return requested === "month" || !input.period
      ? monthPeriod
      : { ...monthPeriod, clamped: true };
  }

  switch (requested) {
    case "30d":
      return { from: shiftDays(today, -29), to: today, key: "30d", label: "Last 30 days", clamped: false };
    case "90d":
      return { from: shiftDays(today, -89), to: today, key: "90d", label: "Last 90 days", clamped: false };
    case "year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today, key: "year", label: "This year", clamped: false };
    case "custom": {
      const from = DATE_RE.test(input.from ?? "") ? (input.from as ISODate) : monthStart;
      let to = DATE_RE.test(input.to ?? "") ? (input.to as ISODate) : today;
      // Pas de futur : il n'y a rien à rapporter, et l'axe serait faussé.
      if (to > today) to = today;
      // Bornes inversées : on les remet dans l'ordre plutôt que de renvoyer vide.
      const [a, b] = from <= to ? [from, to] : [to, from];
      return { from: a, to: b, key: "custom", label: "Custom range", clamped: false };
    }
    default:
      return monthPeriod;
  }
}
