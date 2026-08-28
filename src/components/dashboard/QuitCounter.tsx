"use client";

import { useEffect, useState, useTransition } from "react";
import { recordRelapse } from "@/lib/actions/quit";

interface QuitCounterProps {
  habitId: string;
  name: string;
  emoji: string | null;
  quitStartedAt: string; // ISO — source de vérité pour le décompte, pas de requête serveur
  bestMs: number; // record d'abstinence, figé au dernier rendu serveur
  relapseCount: number;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = days > 0 ? [`${days}d`, `${hours}h`, `${minutes}m`, `${seconds}s`] : [`${hours}h`, `${minutes}m`, `${seconds}s`];
  return parts.join(" ");
}

/** Phase 2 roadmap : chronomètre depuis `quitStartedAt`, ticke côté client
 *  seul (aucune requête). Se remonte (voir `key` dans QuitPanel) après une
 *  rechute pour repartir d'un état frais sans logique de reset manuelle. */
export function QuitCounter({ habitId, name, emoji, quitStartedAt, bestMs, relapseCount }: QuitCounterProps) {
  const startMs = new Date(quitStartedAt).getTime();
  // null jusqu'au montage client : Date.now() calculé dans l'initializer de
  // useState tournait aussi côté serveur (SSR d'un composant "use client"),
  // donnant un texte différent de l'hydratation quelques centaines de ms
  // plus tard — mismatch d'hydratation React intermittent (visible quand
  // l'écart franchit une frontière de seconde/minute affichée). Un état
  // initial identique des deux côtés, peuplé par effet après montage,
  // l'élimine complètement.
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Exception légitime à la règle : ce setState synchrone est justement le
    // point de la garde `null` ci-dessus — peupler la valeur réelle une fois
    // le montage client garanti, pas un effet en cascade évitable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setElapsedMs(Date.now() - startMs);
    const id = setInterval(() => setElapsedMs(Date.now() - startMs), 1000);
    return () => clearInterval(id);
  }, [startMs]);

  const isRecord = elapsedMs !== null && elapsedMs >= bestMs;

  return (
    <div className="quitcard">
      <div className="quitcard__head">
        <span className="quitcard__name">
          {name} {emoji}
        </span>
        {relapseCount > 0 && (
          <span className="quitcard__relapses">{relapseCount} relapse{relapseCount > 1 ? "s" : ""}</span>
        )}
      </div>
      <p className="quitcard__timer">{formatDuration(elapsedMs ?? 0)}</p>
      <p className="quitcard__best">{isRecord ? "🏆 personal best" : `Best: ${formatDuration(bestMs)}`}</p>
      <button
        type="button"
        className="quitcard__relapse"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`Log a relapse for "${name}"? This resets the counter to zero.`)) return;
          startTransition(async () => {
            await recordRelapse({ habitId });
          });
        }}
      >
        I relapsed
      </button>
    </div>
  );
}
