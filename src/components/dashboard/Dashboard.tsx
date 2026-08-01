import type { MonthStats } from "@/lib/stats";
import type { ISODate, MonthKey } from "@/lib/dates";
import type { BoardSkinKey } from "@/lib/config";
import { BarChart } from "@/components/charts/BarChart";
import { Sidebar } from "./Sidebar";
import { WarriorBoard } from "./WarriorBoard";
import { StatsPanel } from "./StatsPanel";

export interface DashboardHabit {
  id: string;
  name: string;
  emoji: string | null;
  goal: number | null;
  loggedDates: Set<ISODate>;
  /** Pauses + boucliers déjà consommés (voir lib/data.ts) — optionnel comme
   *  dans HabitWithLogs, dont ce type est alimenté. */
  pausedDates?: Set<ISODate>;
  tags?: string[];
}

interface DashboardProps {
  month: MonthKey;
  stats: MonthStats;
  habits: DashboardHabit[];
  today: ISODate;
  canAdd: boolean;
  limit: number;
  userEmail: string;
  plan: "FREE" | "PRO";
  boardSkin: BoardSkinKey;
  shieldsUsed: number;
}

/** Assemblage 3 zones : sidebar noire / centre (daily + grille) / stats à droite. */
export function Dashboard({ month, stats, habits, today, canAdd, limit, userEmail, plan, boardSkin, shieldsUsed }: DashboardProps) {
  const todayIndex = stats.days.findIndex((d) => d.date === today);

  // Jour "manqué" = jour passé du mois sans une seule coche. Les jours déjà
  // couverts par un bouclier sont exclus : le calcul les traite comme des
  // pauses, donc ils ne comptent plus comme des trous.
  const missedDates = stats.days
    .filter((d) => d.date < today)
    .filter((d) => !habits.some((h) => h.loggedDates.has(d.date) || h.pausedDates?.has(d.date)))
    .map((d) => d.date);

  return (
    <div className="dashboard" data-skin={boardSkin}>
      <Sidebar
        month={month}
        habits={habits}
        stats={stats}
        canAdd={canAdd}
        limit={limit}
        userEmail={userEmail}
        plan={plan}
        boardSkin={boardSkin}
        today={today}
        shieldsUsed={shieldsUsed}
        missedDates={missedDates}
      />

      <main className="dashboard__main">
        <div className="panel panel--daily">
          <h2 className="panel__title">Daily Progress</h2>
          <BarChart
            values={stats.dailyProgress}
            labels={stats.days.map((d) => d.dow)}
            highlightIndex={todayIndex === -1 ? undefined : todayIndex}
            height={120}
          />
        </div>
        <WarriorBoard stats={stats} habits={habits} today={today} />
      </main>

      <StatsPanel stats={stats} habits={habits} plan={plan} />
    </div>
  );
}
