"use client";

import { useOptimistic, useTransition } from "react";
import { deleteTask, toggleTaskComplete } from "@/lib/actions/tasks";

interface TaskItemProps {
  id: string;
  title: string;
  dueDate: string | null;
  priority: boolean;
  completed: boolean;
  today: string;
}

/** Phase 4 roadmap (minimal) — coche optimiste, même convention que DayCheckbox. */
export function TaskItem({ id, title, dueDate, priority, completed, today }: TaskItemProps) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(completed);
  const overdue = !optimistic && !!dueDate && dueDate < today;

  return (
    <li className={optimistic ? "taskitem taskitem--done" : "taskitem"}>
      <button
        type="button"
        role="checkbox"
        aria-checked={optimistic}
        aria-label={title}
        className="taskitem__check"
        onClick={() => {
          const next = !optimistic;
          startTransition(async () => {
            setOptimistic(next);
            try {
              await toggleTaskComplete({ taskId: id });
            } catch {
              // le revalidate ramènera l'état serveur
            }
          });
        }}
      >
        {optimistic && (
          <svg viewBox="0 0 16 16" className="taskitem__checkicon" aria-hidden>
            <path d="M3 8.5 6.5 12 13 4.5" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className="taskitem__title">
        {priority && <span className="taskitem__flag">🚩</span>}
        {title}
      </span>
      {dueDate && <span className={overdue ? "taskitem__due taskitem__due--overdue" : "taskitem__due"}>{dueDate}</span>}
      <button
        type="button"
        className="taskitem__delete"
        aria-label={`Delete ${title}`}
        onClick={() =>
          startTransition(async () => {
            await deleteTask({ taskId: id });
          })
        }
      >
        ×
      </button>
    </li>
  );
}
