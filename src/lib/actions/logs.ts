"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { isFuture } from "@/lib/dates";

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
