"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { isFuture } from "@/lib/dates";

const SetMoodSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.number().int().min(1).max(5),
});

export async function setMood(input: unknown): Promise<{ ok: boolean }> {
  const { date, value } = SetMoodSchema.parse(input);
  const user = await getCurrentUser();

  if (isFuture(date, user.timezone)) throw new Error("FUTURE_DATE");

  await prisma.moodLog.upsert({
    where: { userId_date: { userId: user.id, date } },
    update: { value },
    create: { userId: user.id, date, value },
  });

  revalidatePath("/app");
  return { ok: true };
}
