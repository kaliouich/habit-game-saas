import type { HabitUnit, MonthStats, QuitStreak } from "@/lib/stats";
import type { ISODate, MonthKey } from "@/lib/dates";
import type { BoardSkinKey } from "@/lib/config";
import type { TaskRow } from "@/lib/data";
import { BarChart } from "@/components/charts/BarChart";
import { Sidebar } from "./Sidebar";
import { MonthGrid } from "./MonthGrid";
import { QuitPanel } from "./QuitPanel";
import { TaskPanel } from "./TaskPanel";
import { TimerPanel } from "./TimerPanel";
import { StatsPanel } from "./StatsPanel";
import { AdBanner } from "@/components/AdBanner";
import { AdSidebar } from "@/components/AdSidebar";

export interface DashboardHabit {
  id: string;
  name: string;
  emoji: string | null;
  type: "BUILD" | "QUIT";
  goal: number | null;
  loggedDates: Set<ISODate>;
  /** Pauses + boucliers déjà consommés (voir lib/data.ts) — optionnel comme
   *  dans HabitWithLogs, dont ce type est alimenté. */
  pausedDates?: Set<ISODate>;
  tags?: string[];
  /** QUIT uniquement (Phase 2 roadmap). */
  quitStartedAt?: Date | null;
  /** Phase 1 roadmap — absent/"TIMES" = case à cocher classique. */
  unit?: HabitUnit;
  targetValue?: number | null;
  unitLabel?: string | null;
  logValues?: Map<ISODate, number>;
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
  quitStreaks: Map<string, QuitStreak>;
  tasks: TaskRow[];
}

/** Assemblage 3 zones : sidebar noire / centre (daily + grille) / stats à droite. */
export function Dashboard({
  month,
  stats,
  habits,
  today,
  canAdd,
  limit,
  userEmail,
  plan,
  boardSkin,
  shieldsUsed,
  quitStreaks,
  tasks,
}: DashboardProps) {
  const todayIndex = stats.days.findIndex((d) => d.date === today);

  // QUIT n'est plus une case à cocher (Phase 2 roadmap) : la grille mensuelle
  // et le calcul des "jours manqués" ne concernent que BUILD.
  const buildHabits = habits.filter((h) => h.type !== "QUIT");
  const quitHabits = habits.filter((h) => h.type === "QUIT");
  // Phase 7 roadmap (minuteur) : seules les habitudes en durée (Phase 1) ont un
  // sens à alimenter depuis une session chronométrée.
  const timerHabits = buildHabits.filter(
    (h): h is typeof h & { unit: "MINUTES" | "HOURS" } => h.unit === "MINUTES" || h.unit === "HOURS",
  );

  // Jour "manqué" = jour passé du mois sans une seule coche. Les jours déjà
  // couverts par un bouclier sont exclus : le calcul les traite comme des
  // pauses, donc ils ne comptent plus comme des trous.
  const missedDates = stats.days
    .filter((d) => d.date < today)
    .filter((d) => !buildHabits.some((h) => h.loggedDates.has(d.date) || h.pausedDates?.has(d.date)))
    .map((d) => d.date);

  const showAds = plan === "FREE";

  return (
    <div className="dashboard" data-skin={boardSkin}>
      <AdBanner showAds={showAds} slot="0000000000" />

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
        <TaskPanel tasks={tasks} today={today} />
        {timerHabits.length > 0 && <TimerPanel habits={timerHabits} today={today} />}
        {quitHabits.length > 0 && <QuitPanel habits={quitHabits} quitStreaks={quitStreaks} />}
        <MonthGrid stats={stats} habits={buildHabits} today={today} />
      </main>

      <div className="dashboard__right">
        <StatsPanel stats={stats} habits={buildHabits} plan={plan} />
        <AdSidebar showAds={showAds} slot="0000000001" />
      </div>

      {/* Cible du portail de HabitMenu (voir ce fichier) : un enfant direct de
          .dashboard, pas de .sidebar — hérite le thème (--bg/--cell/…, posés
          sur .dashboard[data-skin]) sans hériter la stacking context piégée
          par le position:sticky de .sidebar. */}
      <div id="habitmenu-portal" />
    </div>
  );
}
