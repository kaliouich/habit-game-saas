"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { canAddHabit, maxHabits } from "@/lib/quotas";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { generateHabitsFromGoal, isAiOnboardingConfigured } from "@/lib/ai";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";
import type { HabitDraft } from "@/lib/onboardingCatalog";

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

const HabitDraftSchema = z.object({
  name: z.string().trim().min(1).max(40),
  emoji: z.string().trim().min(1).max(8),
  type: z.enum(["BUILD", "QUIT"]),
  unit: z.enum(["TIMES", "MINUTES", "HOURS", "COUNT", "STEPS", "KM", "CALORIES"]),
  targetValue: z.number().positive().max(1_000_000).optional(),
  unitLabel: z.string().trim().max(20).optional(),
  rationale: z.string().max(140).optional(),
});

/** Écran Review (les deux chemins, questionnaire et IA, y convergent) —
 *  même validation que createHabit (actions/habits.ts) : le client a pu
 *  éditer emoji/nom, jamais confiance aveugle même en usage interne. */
export async function createHabitsFromSelection(input: unknown): Promise<{ ok: boolean; created: number; error?: string }> {
  const drafts = z.array(HabitDraftSchema).min(1).max(6).parse(input);
  const user = await getCurrentUser();

  const activeCount = await prisma.habit.count({ where: { userId: user.id, archivedAt: null } });
  if (!canAddHabit(user.plan, activeCount)) {
    return { ok: false, created: 0, error: `Limite du plan ${user.plan} atteinte (${maxHabits(user.plan)} habitudes)` };
  }

  const room = maxHabits(user.plan) - activeCount;
  const toCreate = drafts.slice(0, Math.max(0, room));

  const last = await prisma.habit.findFirst({
    where: { userId: user.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const startPosition = (last?.position ?? -1) + 1;

  await prisma.habit.createMany({
    data: toCreate.map((h, i) => ({
      userId: user.id,
      name: h.name,
      emoji: h.emoji,
      type: h.type,
      position: startPosition + i,
      quitStartedAt: h.type === "QUIT" ? new Date() : null,
      unit: h.unit,
      targetValue: h.unit === "TIMES" ? null : h.targetValue ?? null,
      unitLabel: h.unit === "COUNT" ? h.unitLabel || null : null,
    })),
  });

  revalidatePath("/app");
  return { ok: true, created: toCreate.length };
}

const GoalSurveySchema = z.object({
  goal: z.string().trim().min(1).max(60),
  scope: z.string().trim().min(1).max(60),
  obstacle: z.string().trim().min(1).max(60),
  timeBudget: z.string().trim().min(1).max(60),
});

/** Écran-sondage IA (tap-only, voir GoalScreen/OnboardingWizard) — wrapper
 *  server action autour de generateHabitsFromGoal (lib/ai.ts) :
 *  authentification + rate-limit ici, l'appel Claude lui-même reste isolé
 *  dans lib/ai.ts. */
export async function generateHabitsAction(
  surveyInput: unknown,
): Promise<{ ok: boolean; milestone?: string; habits?: HabitDraft[]; error?: string }> {
  if (!isAiOnboardingConfigured()) {
    return { ok: false, error: "AI_NOT_CONFIGURED" };
  }

  const input = GoalSurveySchema.parse(surveyInput);
  const user = await getCurrentUser();

  const limited = rateLimit(`ai-onboarding:${user.id}`, RATE_LIMITS.aiHabitGeneration.limit, RATE_LIMITS.aiHabitGeneration.windowMs);
  if (!limited.ok) {
    return { ok: false, error: "RATE_LIMITED" };
  }

  try {
    const locale = (await getLocale()) as Locale;
    const { milestone, habits } = await generateHabitsFromGoal({ ...input, language: LOCALE_LABELS[locale] ?? "English" });
    return { ok: true, milestone, habits };
  } catch {
    return { ok: false, error: "AI_GENERATION_FAILED" };
  }
}

/** "Start over" (Billing page) — supprime TOUTES les habitudes du compte
 *  (et, en cascade via le schema Prisma, leurs logs/pauses/rechutes) puis
 *  renvoie vers l'onboarding pour reconstruire la liste depuis zéro.
 *  Irréversible : la confirmation à deux temps vit côté client
 *  (StartOverPanel), pas ici — cette action suppose déjà le consentement. */
export async function resetHabitsAction(): Promise<{ ok: boolean; deleted: number }> {
  const user = await getCurrentUser();
  const { count } = await prisma.habit.deleteMany({ where: { userId: user.id } });
  revalidatePath("/app");
  return { ok: true, deleted: count };
}
