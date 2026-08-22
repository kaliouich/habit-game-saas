"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { maxHabits } from "@/lib/quotas";

/** B9 : les 8 habitudes de la vidéo, en 1 clic. */
const STARTER_HABITS = [
  { name: "Wake up at 05:00", emoji: "⏰", type: "BUILD" as const },
  { name: "Gym", emoji: "💪", type: "BUILD" as const },
  { name: "Reading / Learning", emoji: "📖", type: "BUILD" as const },
  { name: "Day Planning", emoji: "📅", type: "BUILD" as const },
  { name: "Project Work", emoji: "🎯", type: "BUILD" as const },
  { name: "No Alcohol", emoji: "🍾", type: "QUIT" as const },
  { name: "Social Media Detox", emoji: "🌿", type: "QUIT" as const },
  { name: "Cold Shower", emoji: "🚿", type: "BUILD" as const },
];

export async function seedStarterHabits(): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();

  const existing = await prisma.habit.count({ where: { userId: user.id } });
  if (existing > 0) {
    return { ok: false, error: "ALREADY_HAS_HABITS" };
  }

  // Dérivé du quota du plan, jamais recopié : un `3` en dur ici privait les
  // comptes FREE de 2 habitudes offertes (quota réel : PLAN_LIMITS.FREE = 5).
  const limit = Math.min(STARTER_HABITS.length, maxHabits(user.plan));

  await prisma.habit.createMany({
    data: STARTER_HABITS.slice(0, limit).map((h, i) => ({
      userId: user.id,
      name: h.name,
      emoji: h.emoji,
      type: h.type,
      position: i,
      // QUIT démarre son compteur d'abstinence dès la création (voir actions/habits.ts).
      quitStartedAt: h.type === "QUIT" ? new Date() : null,
    })),
  });

  revalidatePath("/app");
  return { ok: true };
}
