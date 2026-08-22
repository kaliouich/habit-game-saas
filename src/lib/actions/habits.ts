"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { canAddHabit, maxHabits } from "@/lib/quotas";

const NameSchema = z.string().trim().min(1).max(40);
const EmojiSchema = z.string().trim().max(8).optional();
const HabitUnitSchema = z.enum(["TIMES", "MINUTES", "HOURS", "COUNT", "STEPS", "KM", "CALORIES"]);
const UnitLabelSchema = z.string().trim().max(20).optional();

const CreateHabitSchema = z.object({
  name: NameSchema,
  emoji: EmojiSchema,
  type: z.enum(["BUILD", "QUIT"]).default("BUILD"),
  // Phase 1 roadmap — socle quantifié. TIMES = ancienne case à cocher.
  unit: HabitUnitSchema.default("TIMES"),
  targetValue: z.number().positive().max(1_000_000).nullable().optional(),
  unitLabel: UnitLabelSchema,
});

export async function createHabit(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const data = CreateHabitSchema.parse(input);
  const user = await getCurrentUser();

  const activeCount = await prisma.habit.count({
    where: { userId: user.id, archivedAt: null },
  });
  if (!canAddHabit(user.plan, activeCount)) {
    return { ok: false, error: `Limite du plan ${user.plan} atteinte (${maxHabits(user.plan)} habitudes)` };
  }

  const last = await prisma.habit.findFirst({
    where: { userId: user.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.habit.create({
    data: {
      userId: user.id,
      name: data.name,
      emoji: data.emoji || null,
      type: data.type,
      position: (last?.position ?? -1) + 1,
      // QUIT démarre son compteur d'abstinence dès la création.
      quitStartedAt: data.type === "QUIT" ? new Date() : null,
      unit: data.unit,
      targetValue: data.unit === "TIMES" ? null : data.targetValue ?? null,
      unitLabel: data.unit === "COUNT" ? data.unitLabel || null : null,
    },
  });

  revalidatePath("/app");
  return { ok: true };
}

const TagSchema = z.string().trim().min(1).max(20);

const UpdateHabitSchema = z.object({
  habitId: z.string().min(1),
  name: NameSchema.optional(),
  emoji: EmojiSchema,
  goal: z.number().int().min(1).max(31).nullable().optional(),
  tags: z.array(TagSchema).max(5).optional(),
  targetValue: z.number().positive().max(1_000_000).nullable().optional(),
  unitLabel: UnitLabelSchema,
});

export async function updateHabit(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const { habitId, ...data } = UpdateHabitSchema.parse(input);
  const user = await getCurrentUser();

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id },
    select: { id: true },
  });
  if (!habit) throw new Error("NOT_FOUND");

  // Tags = organisation, réservée à Pro (voir PRO-PLAN.md).
  if (data.tags !== undefined && user.plan !== "PRO") {
    return { ok: false, error: "PRO_REQUIRED" };
  }

  await prisma.habit.update({
    where: { id: habitId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.emoji !== undefined && { emoji: data.emoji || null }),
      ...(data.goal !== undefined && { goal: data.goal }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
      ...(data.unitLabel !== undefined && { unitLabel: data.unitLabel || null }),
    },
  });

  revalidatePath("/app");
  return { ok: true };
}

const ArchiveSchema = z.object({ habitId: z.string().min(1) });

export async function archiveHabit(input: unknown): Promise<{ ok: boolean }> {
  const { habitId } = ArchiveSchema.parse(input);
  const user = await getCurrentUser();

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id, archivedAt: null },
    select: { id: true },
  });
  if (!habit) throw new Error("NOT_FOUND");

  await prisma.habit.update({
    where: { id: habitId },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/app");
  return { ok: true };
}
