"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { isFuture } from "@/lib/dates";

const NoteDateSchema = z.object({
  habitId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const ToggleLogSchema = z.object({
  habitId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function toggleLog(input: unknown): Promise<{ ok: boolean }> {
  const { habitId, date } = ToggleLogSchema.parse(input);
  const user = await getCurrentUser();

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id, archivedAt: null },
    select: { id: true },
  });
  if (!habit) throw new Error("NOT_FOUND");
  if (isFuture(date, user.timezone)) throw new Error("FUTURE_DATE");

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date } },
    select: { id: true },
  });

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
  } else {
    try {
      await prisma.habitLog.create({ data: { habitId, date } });
    } catch (e: unknown) {
      // Double-clic / course : la ligne existe déjà, l'état final est le bon
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }

  revalidatePath("/app");
  return { ok: true };
}

/** Note par jour (Pro) — nécessite un HabitLog existant, donc pas de check préalable ici. */
export async function getLogNote(input: unknown): Promise<{ note: string | null }> {
  const { habitId, date } = NoteDateSchema.parse(input);
  const user = await getCurrentUser();

  const log = await prisma.habitLog.findFirst({
    where: { habitId, date, habit: { userId: user.id } },
    select: { note: true },
  });
  return { note: log?.note ?? null };
}

const SetLogNoteSchema = NoteDateSchema.extend({
  note: z.string().trim().max(280),
});

export async function setLogNote(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const { habitId, date, note } = SetLogNoteSchema.parse(input);
  const user = await getCurrentUser();

  if (user.plan !== "PRO") {
    return { ok: false, error: "PRO_REQUIRED" };
  }

  const log = await prisma.habitLog.findFirst({
    where: { habitId, date, habit: { userId: user.id } },
    select: { id: true },
  });
  if (!log) {
    return { ok: false, error: "NO_LOG" }; // check the habit for this day before adding a note
  }

  await prisma.habitLog.update({ where: { id: log.id }, data: { note: note || null } });
  revalidatePath("/app");
  return { ok: true };
}
