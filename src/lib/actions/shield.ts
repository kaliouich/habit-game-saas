"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { SHIELDS_PER_MONTH } from "@/lib/config";
import { monthOf, todayInTz, daysInMonth, pad2 } from "@/lib/dates";

const UseShieldSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Consomme un Streak Shield sur un jour passé : ce jour est ensuite traité
 * comme une pause par currentStreak/bestStreak, donc il n'interrompt plus la
 * série (sans pour autant compter comme un jour réussi).
 *
 * Règles : jour strictement passé (on ne "protège" pas le futur, et aujourd'hui
 * est encore rattrapable en cochant), quota mensuel selon le plan, un seul
 * bouclier par date (contrainte unique en base).
 */
export async function useStreakShield(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const { date } = UseShieldSchema.parse(input);
  const user = await getCurrentUser();
  const today = todayInTz(user.timezone);

  if (date >= today) return { ok: false, error: "NOT_PAST" };

  const month = monthOf(date);
  // Un bouclier ne peut couvrir qu'un jour du mois en cours : sinon on pourrait
  // réparer rétroactivement n'importe quelle série, ce qui vide la mécanique.
  if (month !== monthOf(today)) return { ok: false, error: "NOT_CURRENT_MONTH" };

  const quota = SHIELDS_PER_MONTH[user.plan];
  const used = await prisma.streakShield.count({
    where: {
      userId: user.id,
      date: { gte: `${month}-01`, lte: `${month}-${pad2(daysInMonth(month))}` },
    },
  });
  if (used >= quota) return { ok: false, error: "NO_SHIELDS_LEFT" };

  try {
    await prisma.streakShield.create({ data: { userId: user.id, date } });
  } catch {
    // Contrainte unique (userId, date) : déjà protégé, rien à faire.
    return { ok: false, error: "ALREADY_SHIELDED" };
  }

  revalidatePath("/app");
  return { ok: true };
}
