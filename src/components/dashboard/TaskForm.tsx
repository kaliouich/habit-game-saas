"use client";

import { useRef, useTransition } from "react";
import { createTask } from "@/lib/actions/tasks";

/** Phase 4 roadmap (minimal) — titre + échéance optionnelle + drapeau, rien de plus. */
export function TaskForm({ today }: { today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="taskform"
      action={(formData: FormData) => {
        const title = String(formData.get("title") ?? "").trim();
        const dueDate = String(formData.get("dueDate") ?? "").trim();
        const priority = formData.get("priority") === "on";
        if (!title) return;
        startTransition(async () => {
          await createTask({ title, dueDate: dueDate || undefined, priority });
          formRef.current?.reset();
        });
      }}
    >
      <input name="title" placeholder="Add a task…" maxLength={140} required autoComplete="off" />
      <input type="date" name="dueDate" defaultValue={today} />
      <label className="taskform__flag" title="Priority">
        <input type="checkbox" name="priority" /> 🚩
      </label>
      <button type="submit" disabled={isPending} aria-label="Add task">
        +
      </button>
    </form>
  );
}
