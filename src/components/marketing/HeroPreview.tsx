"use client";

import { useEffect, useMemo, useState } from "react";

const HABITS = ["Wake up at 05:00", "Gym", "Reading", "Deep work · 2h"];
const WEIGHTS = [0.86, 0.55, 0.78, 0.66];
const DAYS = 28;
const TODAY = 24;

function seeded(h: number, d: number): number {
  const x = Math.sin((h + 1) * 12.9898 + (d + 1) * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Aperçu interactif de la landing — le board du produit, pas une capture d'écran. */
export function HeroPreview() {
  const initial = useMemo(
    () =>
      HABITS.map((_, h) =>
        Array.from({ length: DAYS }, (_, d) => d < TODAY && seeded(h, d) < WEIGHTS[h]),
      ),
    [],
  );

  const [state, setState] = useState(initial);
  const [revealed, setRevealed] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const totalOn = state.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const totalPossible = HABITS.length * TODAY;
  const streak = (() => {
    let best = 0;
    for (const row of state) {
      let run = 0;
      for (let d = 0; d < TODAY; d++) {
        run = row[d] ? run + 1 : 0;
        if (run > best) best = run;
      }
    }
    return best;
  })();
  const xp = totalOn * 10;
  const level = Math.floor(xp / 500) + 1;

  useEffect(() => {
    if (revealed) return; // déjà révélé synchro (reduced motion) — pas de setState ici
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, [revealed]);

  return (
    <div className="heroboard" aria-hidden="true">
      <div className="heroboard__top">
        <div className="heroboard__level">
          <b>{level}</b>
          <div>
            <small>Level</small>
            <span>{xp % 500} / 500 XP</span>
          </div>
        </div>
        <span className="heroboard__streak">🔥 {streak}</span>
      </div>

      <div className="heroboard__label">
        <span>This month</span>
        <span>
          {totalOn}/{totalPossible} ticks
        </span>
      </div>
      <div className="heroboard__grid">
        {state.map((row, h) => (
          <div className="heroboard__row" key={HABITS[h]}>
            {row.map((on, d) => (
              <span
                key={d}
                data-on={revealed && on ? "1" : "0"}
                data-today={d === TODAY - 1 ? "1" : "0"}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="heroboard__tasks">
        {HABITS.map((name, h) => {
          const done = state[h][TODAY - 1] ?? false;
          return (
            <button
              key={name}
              type="button"
              className="heroboard__task"
              aria-pressed={done}
              tabIndex={-1}
              onClick={() => {
                setState((prev) => {
                  const next = prev.map((row) => [...row]);
                  next[h][TODAY - 1] = !next[h][TODAY - 1];
                  return next;
                });
              }}
            >
              <span className="heroboard__box" />
              <span>{name}</span>
            </button>
          );
        })}
      </div>

      <div className="heroboard__shelf">
        <p className="heroboard__shelflabel">Badges</p>
        <div className="heroboard__badges">
          <span className="heroboard__badge" data-got="1" title="Perfect week">
            🏅
          </span>
          <span className="heroboard__badge" data-got="1" title="7-day streak">
            🔥
          </span>
          <span className="heroboard__badge" data-got="1" title="Early riser">
            🌅
          </span>
          <span className="heroboard__badge" data-got="0" title="Locked">
            🏔
          </span>
          <span className="heroboard__badge" data-got="0" title="Locked">
            💎
          </span>
          <span className="heroboard__badge" data-got="0" title="Locked">
            👑
          </span>
        </div>
      </div>
    </div>
  );
}
