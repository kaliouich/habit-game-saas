import type { TaskRow } from "@/lib/data";
import type { ISODate } from "@/lib/dates";
import { TaskForm } from "./TaskForm";
import { TaskItem } from "./TaskItem";

interface TaskPanelProps {
  tasks: TaskRow[];
  today: ISODate;
}

/** Phase 4 roadmap (minimal) — liste plate, pas de projets/sous-tâches/récurrence. */
export function TaskPanel({ tasks, today }: TaskPanelProps) {
  return (
    <div className="panel panel--tasks">
      <h2 className="panel__title">To-Do</h2>
      <div className="taskpanel">
        <TaskForm today={today} />
        {tasks.length === 0 ? (
          <p className="taskpanel__empty">Nothing on your list.</p>
        ) : (
          <ul className="tasklist">
            {tasks.map((t) => (
              <TaskItem
                key={t.id}
                id={t.id}
                title={t.title}
                dueDate={t.dueDate}
                priority={t.priority}
                completed={!!t.completedAt}
                today={today}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
