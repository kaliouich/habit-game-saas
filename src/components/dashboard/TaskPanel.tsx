import { getTranslations } from "next-intl/server";
import type { TaskRow } from "@/lib/data";
import type { ISODate } from "@/lib/dates";
import { TaskForm } from "./TaskForm";
import { TaskItem } from "./TaskItem";

interface TaskPanelProps {
  tasks: TaskRow[];
  today: ISODate;
}

/** Phase 4 roadmap (minimal) — liste plate, pas de projets/sous-tâches/récurrence. */
export async function TaskPanel({ tasks, today }: TaskPanelProps) {
  const t = await getTranslations("Dashboard.tasks");
  return (
    <div className="panel panel--tasks">
      <h2 className="panel__title">{t("title")}</h2>
      <div className="taskpanel">
        <TaskForm today={today} />
        {tasks.length === 0 ? (
          <p className="taskpanel__empty">{t("empty")}</p>
        ) : (
          <ul className="tasklist">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                id={task.id}
                title={task.title}
                dueDate={task.dueDate}
                priority={task.priority}
                completed={!!task.completedAt}
                today={today}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
