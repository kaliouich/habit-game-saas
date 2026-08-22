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
    select: { id: true, unit: true },
  });
  if (!habit) throw new Error("NOT_FOUND");
  // Phase 1 roadmap : les unités quantifiées passent par setLogValue, qui sait
  // gérer une valeur partielle — un simple booléen n'aurait pas de sens.
  if (habit.unit !== "TIMES") throw new Error("USE_SET_LOG_VALUE");
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

const SetLogValueSchema = z.object({
  habitId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.number().min(0).max(1_000_000),
});

/** Phase 1 roadmap : équivalent de toggleLog pour les unités quantifiées
 *  (COUNT/STEPS/MINUTES/…). `value <= 0` supprime le log — même sémantique
 *  que "décocher" (convention n°3 : jamais de valeur à zéro stockée). */
export async function setLogValue(input: unknown): Promise<{ ok: boolean }> {
  const { habitId, date, value } = SetLogValueSchema.parse(input);
  const user = await getCurrentUser();

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id, archivedAt: null },
    select: { id: true, unit: true },
  });
  if (!habit) throw new Error("NOT_FOUND");
  if (habit.unit === "TIMES") throw new Error("USE_TOGGLE_LOG");
  if (isFuture(date, user.timezone)) throw new Error("FUTURE_DATE");

  if (value <= 0) {
    await prisma.habitLog.deleteMany({ where: { habitId, date } });
  } else {
    await prisma.habitLog.upsert({
      where: { habitId_date: { habitId, date } },
      create: { habitId, date, value },
      update: { value },
    });
  }

  revalidatePath("/app");
  return { ok: true };
}

const IncrementLogValueSchema = z.object({
  habitId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive().max(1_000_000),
});

/** Phase 7 roadmap (minuteur) : additionne à la valeur déjà loggée ce jour-là
 *  plutôt que de l'écraser — une session de minuteur peut s'ajouter à un
 *  stepper déjà utilisé le même jour (setLogValue, lui, écrase — usage
 *  différent : édition directe d'une cellule vs accumulation de sessions). */
export async function incrementLogValue(input: unknown): Promise<{ ok: boolean }> {
  const { habitId, date, amount } = IncrementLogValueSchema.parse(input);
  const user = await getCurrentUser();

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id, archivedAt: null },
    select: { id: true, unit: true },
  });
  if (!habit) throw new Error("NOT_FOUND");
  if (habit.unit === "TIMES") throw new Error("USE_TOGGLE_LOG");
  if (isFuture(date, user.timezone)) throw new Error("FUTURE_DATE");

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date } },
    select: { id: true, value: true },
  });
  if (existing) {
    await prisma.habitLog.update({ where: { id: existing.id }, data: { value: existing.value + amount } });
  } else {
    await prisma.habitLog.create({ data: { habitId, date, value: amount } });
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
