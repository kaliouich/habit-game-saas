import { isDueOn, prevDay, type ISODate } from "./dates";
import { bestStreak, currentStreak, habitStrength } from "./stats";

export type HeatCell = "done" | "missed" | "off" | "paused" | "future" | "before";

export interface HabitInsights {
  strength: number;
  currentStreak: number;
  bestStreak: number;
  totalDone: number;
  /** Taux de réussite sur les jours prévus (hors pauses) des N derniers jours, null si aucun jour prévu. */
  rate30: number | null;
  rate90: number | null;
  /** Taux par jour de semaine (index 0=dim..6=sam), null si jamais prévu sur la fenêtre. */
  weekdayRates: (number | null)[];
  /** `weeks` colonnes de 7 cellules (index de ligne = jour de semaine 0..6), du plus ancien au plus récent. */
  heatmap: { date: ISODate; state: HeatCell }[][];
}

function dow(date: ISODate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function nextDay(date: ISODate): ISODate {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

/** Tout ce que la page d'une habitude affiche, calculé à partir des mêmes
 *  règles que le tableau de bord (jours prévus, pauses, boucliers). */
export function computeHabitInsights(params: {
  logged: Set<ISODate>;
  paused: Set<ISODate>;
  scheduleDays?: readonly number[];
  createdOn: ISODate;
  today: ISODate;
  weeks?: number;
}): HabitInsights {
  const { logged, paused, scheduleDays, createdOn, today, weeks = 53 } = params;

  const stateOf = (d: ISODate): HeatCell => {
    if (d > today) return "future";
    if (logged.has(d)) return "done";
    if (paused.has(d)) return "paused";
    if (!isDueOn(scheduleDays, d)) return "off";
    if (d < createdOn) return "before";
    // Aujourd'hui non coché n'est pas (encore) un échec.
    return d === today ? "future" : "missed";
  };

  const rateOver = (days: number): number | null => {
    let due = 0;
    let done = 0;
    let cursor = today;
    for (let i = 0; i < days; i++) {
      if (cursor >= createdOn && !paused.has(cursor) && isDueOn(scheduleDays, cursor)) {
        if (logged.has(cursor)) {
          due++;
          done++;
        } else if (cursor !== today) {
          due++;
        }
      }
      cursor = prevDay(cursor);
    }
    return due === 0 ? null : done / due;
  };

  // Taux par jour de semaine sur la fenêtre de 53 semaines.
  const dueByDow = Array<number>(7).fill(0);
  const doneByDow = Array<number>(7).fill(0);

  // Grille : se termine sur la semaine (dim→sam) qui contient today.
  const endOfWeek = (() => {
    let d = today;
    while (dow(d) !== 6) d = nextDay(d);
    return d;
  })();
  let start = endOfWeek;
  for (let i = 0; i < weeks * 7 - 1; i++) start = prevDay(start);

  const heatmap: HabitInsights["heatmap"] = [];
  let cursor = start;
  for (let w = 0; w < weeks; w++) {
    const col: { date: ISODate; state: HeatCell }[] = [];
    for (let r = 0; r < 7; r++) {
      const state = stateOf(cursor);
      col.push({ date: cursor, state });
      if (state === "done") {
        dueByDow[r]++;
        doneByDow[r]++;
      } else if (state === "missed") {
        dueByDow[r]++;
      }
      cursor = nextDay(cursor);
    }
    heatmap.push(col);
  }

  return {
    strength: habitStrength(logged, today, paused, scheduleDays),
    currentStreak: currentStreak(logged, today, paused, scheduleDays),
    bestStreak: bestStreak(logged, paused, scheduleDays),
    totalDone: logged.size,
    rate30: rateOver(30),
    rate90: rateOver(90),
    weekdayRates: dueByDow.map((n, i) => (n === 0 ? null : doneByDow[i] / n)),
    heatmap,
  };
}
