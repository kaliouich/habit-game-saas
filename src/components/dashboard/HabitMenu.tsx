"use client";

import { useRef, useTransition } from "react";
import { archiveHabit, updateHabit } from "@/lib/actions/habits";

interface HabitMenuProps {
  habitId: string;
  name: string;
  emoji: string | null;
  goal: number | null;
}

/** V2 : édition d'une habitude (nom, emoji, goal) + archivage, dans un popover. */
export function HabitMenu({ habitId, name, emoji, goal }: HabitMenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [isPending, startTransition] = useTransition();

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
          startTransition(async () => {
            await updateHabit({ habitId, name: newName || undefined, emoji: newEmoji, goal: newGoal });
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
