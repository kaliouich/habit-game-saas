import type { MonthStats } from "@/lib/stats";
import type { ISODate, MonthKey } from "@/lib/dates";
import { BarChart } from "@/components/charts/BarChart";
import { Sidebar } from "./Sidebar";
import { MonthGrid } from "./MonthGrid";
import { StatsPanel } from "./StatsPanel";

export interface DashboardHabit {
  id: string;
  name: string;
  emoji: string | null;
  goal: number | null;
  loggedDates: Set<ISODate>;
}

interface DashboardProps {
  month: MonthKey;
  stats: MonthStats;
  habits: DashboardHabit[];
  today: ISODate;
  canAdd: boolean;
  limit: number;
}

/** Assemblage 3 zones : sidebar noire / centre (daily + grille) / stats à droite. */
export function Dashboard({ month, stats, habits, today, canAdd, limit }: DashboardProps) {
  const todayIndex = stats.days.findIndex((d) => d.date === today);

  return (
    <div className="dashboard">
      <Sidebar month={month} habits={habits} stats={stats} canAdd={canAdd} limit={limit} />

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
        <MonthGrid stats={stats} habits={habits} today={today} />
      </main>

      <StatsPanel stats={stats} />
    </div>
  );
}
