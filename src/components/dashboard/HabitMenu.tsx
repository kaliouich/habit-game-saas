"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { archiveHabit, updateHabit } from "@/lib/actions/habits";
import { getLogNote, setLogNote } from "@/lib/actions/logs";
import { createHabitPause } from "@/lib/actions/pause";
import type { ISODate } from "@/lib/dates";
import { habitUnitConfig, type HabitUnitKey } from "@/lib/config";

interface HabitMenuProps {
  habitId: string;
  name: string;
  emoji: string | null;
  type: "BUILD" | "QUIT";
  goal: number | null;
  tags: string[];
  plan: "FREE" | "PRO";
  today: ISODate;
  /** Phase 1 roadmap — absent/"TIMES" = case à cocher classique (rien à éditer ici). */
  unit?: HabitUnitKey;
  targetValue?: number | null;
  unitLabel?: string | null;
}

/** V2 : édition d'une habitude (nom, emoji, goal) + archivage, dans un popover.
 *  Sprint 6 (Pro) : tags, note du jour, pause / vacation mode.
 *  Phase 2 roadmap : goal (jours cochés) et note du jour n'ont plus de sens
 *  pour QUIT, qui ne produit plus de HabitLog — masqués pour ce type.
 *  Phase 1 roadmap : l'unité n'est pas éditable après création (des logs
 *  existants perdraient leur sens — ex. "1" en TIMES vs "1" en STEPS) ; seule
 *  la cible/jour et le libellé libre (COUNT) le sont. */
export function HabitMenu({ habitId, name, emoji, type, goal, tags, plan, today, unit, targetValue, unitLabel }: HabitMenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [isPending, startTransition] = useTransition();
  const isPro = plan === "PRO";
  const isBuild = type === "BUILD";
  const isQuantified = isBuild && !!unit && unit !== "TIMES";
  const unitConfig = unit ? habitUnitConfig(unit) : null;

  const [note, setNote] = useState<string | null>(null);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [pauseTo, setPauseTo] = useState("");
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [pauseOk, setPauseOk] = useState(false);

  useEffect(() => {
    if (!isPro || !isBuild || noteLoaded) return;
    getLogNote({ habitId, date: today }).then((res) => {
      setNote(res.note ?? "");
      setNoteLoaded(true);
    });
  }, [isPro, isBuild, noteLoaded, habitId, today]);

  return (
    <details className="habitmenu" ref={ref}>
      <summary className="habitmenu__trigger" aria-label={`Edit ${name}`}>
        ⋯
      </summary>
      <form
        className="habitmenu__panel"
        action={(formData: FormData) => {
          const newName = String(formData.get("name") ?? "").trim();
          const newEmoji = String(formData.get("emoji") ?? "").trim();
          const goalRaw = String(formData.get("goal") ?? "").trim();
          const newGoal = goalRaw === "" ? null : Math.max(1, Math.min(31, Number(goalRaw)));
          const tagsRaw = String(formData.get("tags") ?? "").trim();
          const newTags = isPro
            ? tagsRaw
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .slice(0, 5)
            : undefined;
          const targetRaw = String(formData.get("targetValue") ?? "").trim();
          const newUnitLabel = String(formData.get("unitLabel") ?? "").trim();
          startTransition(async () => {
            await updateHabit({
              habitId,
              name: newName || undefined,
              emoji: newEmoji,
              goal: newGoal,
              ...(newTags !== undefined && { tags: newTags }),
              ...(isQuantified && { targetValue: targetRaw === "" ? null : Number(targetRaw) }),
              ...(isQuantified && unit === "COUNT" && { unitLabel: newUnitLabel }),
            });
            ref.current?.removeAttribute("open");
          });
        }}
      >
        <label>
          Name
          <input name="name" defaultValue={name} maxLength={40} />
        </label>
        <label>
          Emoji
          <input name="emoji" defaultValue={emoji ?? ""} maxLength={8} />
        </label>
        {isBuild && (
          <label>
            Goal <span className="habitmenu__hint">(vide = auto)</span>
            <input name="goal" type="number" min={1} max={31} defaultValue={goal ?? ""} />
          </label>
        )}
        {isQuantified && (
          <label>
            Target/day {unitConfig?.suffix && <span className="habitmenu__hint">({unitConfig.suffix})</span>}
            <input name="targetValue" type="number" step="any" min={0} defaultValue={targetValue ?? ""} />
          </label>
        )}
        {isQuantified && unit === "COUNT" && (
          <label>
            Unit label <span className="habitmenu__hint">(ex. verres, pages)</span>
            <input name="unitLabel" defaultValue={unitLabel ?? ""} maxLength={20} />
          </label>
        )}

        <label className={isPro ? "" : "habitmenu__locked"}>
          Tags {!isPro && <span className="habitmenu__hint">(Pro)</span>}
          <input
            name="tags"
            defaultValue={tags.join(", ")}
            placeholder="morning, health…"
            maxLength={100}
            disabled={!isPro}
          />
        </label>
        {!isPro && (
          <Link href="/pricing" className="habitmenu__upsell">
            Unlock tags, notes &amp; pause mode with Pro →
          </Link>
        )}

        {isPro && isBuild && (
          <div className="habitmenu__note">
            <label>
              Note for today
              <textarea
                maxLength={280}
                value={note ?? ""}
                disabled={!noteLoaded}
                onChange={(e) => setNote(e.target.value)}
                placeholder={noteLoaded ? "How did it go?" : "Loading…"}
              />
            </label>
            <button
              type="button"
              disabled={isPending || !noteLoaded}
              onClick={() => {
                setNoteError(null);
                startTransition(async () => {
                  const res = await setLogNote({ habitId, date: today, note: note ?? "" });
                  if (!res.ok) setNoteError(res.error === "NO_LOG" ? "Check the habit today first" : "Error");
                });
              }}
            >
              Save note
            </button>
            {noteError && <p className="habitmenu__error">{noteError}</p>}
          </div>
        )}

        {isPro && (
          <div className="habitmenu__pause">
            <label>
              Pause until <span className="habitmenu__hint">(vacation mode)</span>
              <input type="date" value={pauseTo} onChange={(e) => setPauseTo(e.target.value)} min={today} />
            </label>
            <button
              type="button"
              disabled={isPending || !pauseTo}
              onClick={() => {
                setPauseError(null);
                setPauseOk(false);
                startTransition(async () => {
                  const res = await createHabitPause({ habitId, from: today, to: pauseTo });
                  if (res.ok) {
                    setPauseOk(true);
                    setPauseTo("");
                  } else {
                    setPauseError("Error");
                  }
                });
              }}
            >
              Pause
            </button>
            {pauseOk && <p className="habitmenu__ok">Paused until {pauseTo || "—"} — streak won&apos;t break.</p>}
            {pauseError && <p className="habitmenu__error">{pauseError}</p>}
          </div>
        )}

        <div className="habitmenu__actions">
          <button type="submit" disabled={isPending}>
            Save
          </button>
          <button
            type="button"
            className="habitmenu__archive"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await archiveHabit({ habitId });
              });
            }}
          >
            Archive
          </button>
        </div>
      </form>
    </details>
  );
}
