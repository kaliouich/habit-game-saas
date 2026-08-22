"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { incrementLogValue } from "@/lib/actions/logs";

interface TimerHabit {
  id: string;
  name: string;
  emoji: string | null;
  unit: "MINUTES" | "HOURS";
}

interface TimerPanelProps {
  habits: TimerHabit[];
  today: string;
}

const PRESETS_MIN = [5, 15, 25, 45];

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Phase 7 roadmap (minuteur) — chronomètre simple, pas de cycles Pomodoro
 *  travail/pause imposés (le doc ne les rend pas obligatoires, juste "type
 *  Pomodoro" en référence à l'écran concurrent) : une session alimente un log
 *  en minutes/heures via incrementLogValue. Ticke côté client seul. */
export function TimerPanel({ habits, today }: TimerPanelProps) {
  const [habitId, setHabitId] = useState(habits[0]?.id ?? "");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [logged, setLogged] = useState(false);
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  if (habits.length === 0) return null;

  const habit = habits.find((h) => h.id === habitId) ?? habits[0];

  function logSession() {
    if (elapsed === 0) return;
    const amount = habit.unit === "HOURS" ? elapsed / 3600 : elapsed / 60;
    startTransition(async () => {
      await incrementLogValue({ habitId: habit.id, date: today, amount });
      setElapsed(0);
      setRunning(false);
      setLogged(true);
      setTimeout(() => setLogged(false), 2000);
    });
  }

  return (
    <div className="panel panel--timer">
      <h2 className="panel__title">Timer</h2>
      <div className="timerpanel">
        <select
          value={habit.id}
          onChange={(e) => {
            setHabitId(e.target.value);
            setElapsed(0);
            setRunning(false);
          }}
          disabled={running}
        >
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.emoji} {h.name}
            </option>
          ))}
        </select>

        <div className="timerpanel__presets">
          {PRESETS_MIN.map((m) => (
            <button key={m} type="button" disabled={running} onClick={() => setElapsed(m * 60)}>
              {m}m
            </button>
          ))}
        </div>

        <p className="timerpanel__clock">{formatElapsed(elapsed)}</p>

        <div className="timerpanel__controls">
          <button type="button" onClick={() => setRunning((r) => !r)} disabled={isPending}>
            {running ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => {
              setElapsed(0);
              setRunning(false);
            }}
            disabled={isPending || elapsed === 0}
          >
            Reset
          </button>
          <button type="button" className="timerpanel__log" onClick={logSession} disabled={isPending || elapsed === 0}>
            {logged ? "Logged ✓" : "Log to today"}
          </button>
        </div>
      </div>
    </div>
  );
}
