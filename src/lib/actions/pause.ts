"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const CreatePauseSchema = z
  .object({
    habitId: z.string().min(1),
    from: DateSchema,
    to: DateSchema,
  })
  .refine((v) => v.from <= v.to, { message: "FROM_AFTER_TO" });

/** Pause / vacation mode (Pro) : les jours [from, to] n'entrent ni ne cassent un streak. */
export async function createHabitPause(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const { habitId, from, to } = CreatePauseSchema.parse(input);
  const user = await getCurrentUser();

  if (user.plan !== "PRO") {
    return { ok: false, error: "PRO_REQUIRED" };
  }

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id, archivedAt: null },
    select: { id: true },
  });
  if (!habit) throw new Error("NOT_FOUND");

  await prisma.habitPause.create({ data: { habitId, from, to } });
  revalidatePath("/app");
  return { ok: true };
}

const DeletePauseSchema = z.object({ pauseId: z.string().min(1) });

export async function deleteHabitPause(input: unknown): Promise<{ ok: boolean }> {
  const { pauseId } = DeletePauseSchema.parse(input);
  const user = await getCurrentUser();

  const pause = await prisma.habitPause.findFirst({
    where: { id: pauseId, habit: { userId: user.id } },
    select: { id: true },
  });
  if (!pause) throw new Error("NOT_FOUND");

  await prisma.habitPause.delete({ where: { id: pause.id } });
  revalidatePath("/app");
  return { ok: true };
}
