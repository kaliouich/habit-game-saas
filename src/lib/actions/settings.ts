"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { BOARD_SKINS } from "@/lib/config";

const SKIN_KEYS = BOARD_SKINS.map((s) => s.key) as [string, ...string[]];
const SetBoardSkinSchema = z.object({ skin: z.enum(SKIN_KEYS) });

export async function setBoardSkin(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const { skin } = SetBoardSkinSchema.parse(input);
  const user = await getCurrentUser();

  const def = BOARD_SKINS.find((s) => s.key === skin);
  if (!def) throw new Error("UNKNOWN_SKIN");
  if (def.tier === "pro" && user.plan !== "PRO") {
    return { ok: false, error: "PRO_REQUIRED" };
  }

  await prisma.user.update({ where: { id: user.id }, data: { boardSkin: skin } });
  revalidatePath("/app");
  return { ok: true };
}

const SetDayStartSchema = z.object({ hour: z.number().int().min(0).max(6) });

/** Heure de bascule de la journée (0 = minuit). Borné à 0..6 : au-delà, "aujourd'hui"
 *  deviendrait confus (on est encore "hier" jusqu'au milieu de la matinée). */
export async function setDayStartHour(input: unknown): Promise<{ ok: boolean }> {
  const { hour } = SetDayStartSchema.parse(input);
  const user = await getCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { dayStartHour: hour } });
  revalidatePath("/app");
  return { ok: true };
}
