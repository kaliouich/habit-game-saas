"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { isFuture } from "@/lib/dates";

const SetMoodSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // "value" (humeur) reste le défaut pour ne pas casser les appels existants.
  field: z.enum(["value", "motivation"]).default("value"),
  value: z.number().int().min(1).max(5),
});

/** Humeur ET motivation partagent une ligne MoodLog par jour (une entrée peut
 *  ne renseigner que l'une des deux) — `field` choisit laquelle cet appel
 *  écrit. `create` ne fixe QUE ce champ : Prisma laisse l'autre à null. */
export async function setMood(input: unknown): Promise<{ ok: boolean }> {
  const { date, field, value } = SetMoodSchema.parse(input);
  const user = await getCurrentUser();

  if (isFuture(date, user.timezone)) throw new Error("FUTURE_DATE");

  await prisma.moodLog.upsert({
    where: { userId_date: { userId: user.id, date } },
    update: { [field]: value },
    create: { userId: user.id, date, [field]: value },
  });

  revalidatePath("/app");
  return { ok: true };
}
