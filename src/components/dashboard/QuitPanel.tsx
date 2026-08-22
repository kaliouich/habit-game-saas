import type { QuitStreak } from "@/lib/stats";
import { QuitCounter } from "./QuitCounter";

interface QuitPanelHabit {
  id: string;
  name: string;
  emoji: string | null;
  quitStartedAt?: Date | null;
}

interface QuitPanelProps {
  habits: QuitPanelHabit[];
  quitStreaks: Map<string, QuitStreak>;
}

/** Phase 2 roadmap : QUIT n'est plus une case à cocher — un chronomètre depuis
 *  la dernière rechute. Sorti de la grille mensuelle (MonthGrid), qui reste
 *  BUILD-only, voir Dashboard.tsx. */
export function QuitPanel({ habits, quitStreaks }: QuitPanelProps) {
  if (habits.length === 0) return null;

  return (
    <div className="panel panel--quit">
      <h2 className="panel__title">Quit Habits</h2>
      <div className="quitpanel">
        {habits.map((h) => {
          const streak = quitStreaks.get(h.id);
          if (!h.quitStartedAt || !streak) return null;
          return (
            <QuitCounter
              // Remonte le composant après une rechute pour repartir d'un état
              // frais côté client sans logique de reset manuelle (voir QuitCounter).
              key={`${h.id}-${h.quitStartedAt.toISOString()}`}
              habitId={h.id}
              name={h.name}
              emoji={h.emoji}
              quitStartedAt={h.quitStartedAt.toISOString()}
              bestMs={streak.bestMs}
              relapseCount={streak.relapseCount}
            />
          );
        })}
      </div>
    </div>
  );
}
