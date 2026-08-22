"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const CreateTaskSchema = z.object({
  title: z.string().trim().min(1).max(140),
  dueDate: DateSchema.nullable().optional(),
  priority: z.boolean().default(false),
});

/** Phase 4 roadmap, option minimale : tâche simple rattachée à une journée —
 *  pas de projet, sous-tâche ni récurrence (décision produit du roadmap). */
export async function createTask(input: unknown): Promise<{ ok: boolean }> {
  const data = CreateTaskSchema.parse(input);
  const user = await getCurrentUser();

  const last = await prisma.task.findFirst({
    where: { userId: user.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      title: data.title,
      dueDate: data.dueDate || null,
      priority: data.priority,
      position: (last?.position ?? -1) + 1,
    },
  });

  revalidatePath("/app");
  return { ok: true };
}

const ToggleTaskSchema = z.object({ taskId: z.string().min(1) });

export async function toggleTaskComplete(input: unknown): Promise<{ ok: boolean }> {
  const { taskId } = ToggleTaskSchema.parse(input);
  const user = await getCurrentUser();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
    select: { id: true, completedAt: true },
  });
  if (!task) throw new Error("NOT_FOUND");

  await prisma.task.update({
    where: { id: taskId },
    data: { completedAt: task.completedAt ? null : new Date() },
  });

  revalidatePath("/app");
  return { ok: true };
}

const DeleteTaskSchema = z.object({ taskId: z.string().min(1) });

export async function deleteTask(input: unknown): Promise<{ ok: boolean }> {
  const { taskId } = DeleteTaskSchema.parse(input);
  const user = await getCurrentUser();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
    select: { id: true },
  });
  if (!task) throw new Error("NOT_FOUND");

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/app");
  return { ok: true };
}
