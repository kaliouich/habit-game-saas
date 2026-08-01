"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { archiveHabit, updateHabit } from "@/lib/actions/habits";
import { getLogNote, setLogNote } from "@/lib/actions/logs";
import { createHabitPause } from "@/lib/actions/pause";
import type { ISODate } from "@/lib/dates";

interface HabitMenuProps {
  habitId: string;
  name: string;
  emoji: string | null;
  goal: number | null;
  tags: string[];
  plan: "FREE" | "PRO";
  today: ISODate;
}

/** V2 : édition d'une habitude (nom, emoji, goal) + archivage, dans un popover.
 *  Sprint 6 (Pro) : tags, note du jour, pause / vacation mode. */
export function HabitMenu({ habitId, name, emoji, goal, tags, plan, today }: HabitMenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [isPending, startTransition] = useTransition();
  const isPro = plan === "PRO";

  const [note, setNote] = useState<string | null>(null);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [pauseTo, setPauseTo] = useState("");
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [pauseOk, setPauseOk] = useState(false);

  useEffect(() => {
    if (!isPro || noteLoaded) return;
    getLogNote({ habitId, date: today }).then((res) => {
      setNote(res.note ?? "");
      setNoteLoaded(true);
    });
  }, [isPro, noteLoaded, habitId, today]);

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
          startTransition(async () => {
            await updateHabit({
              habitId,
              name: newName || undefined,
              emoji: newEmoji,
              goal: newGoal,
              ...(newTags !== undefined && { tags: newTags }),
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
        <label>
          Goal <span className="habitmenu__hint">(vide = auto)</span>
          <input name="goal" type="number" min={1} max={31} defaultValue={goal ?? ""} />
        </label>

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

        {isPro && (
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
