"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

const RecordRelapseSchema = z.object({
  habitId: z.string().min(1),
  note: z.string().trim().max(280).optional(),
});

/** Phase 2 roadmap : "J'ai rechuté" — journalise la rechute et repart de zéro. */
export async function recordRelapse(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const { habitId, note } = RecordRelapseSchema.parse(input);
  const user = await getCurrentUser();

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id, archivedAt: null },
    select: { id: true, type: true },
  });
  if (!habit) throw new Error("NOT_FOUND");
  if (habit.type !== "QUIT") return { ok: false, error: "NOT_A_QUIT_HABIT" };

  // Note libre = même règle Pro que HabitLog.note (setLogNote, logs.ts).
  if (note && user.plan !== "PRO") {
    return { ok: false, error: "PRO_REQUIRED" };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.habitRelapse.create({ data: { habitId, occurredAt: now, note: note || null } }),
    prisma.habit.update({ where: { id: habitId }, data: { quitStartedAt: now } }),
  ]);

  revalidatePath("/app");
  return { ok: true };
}
