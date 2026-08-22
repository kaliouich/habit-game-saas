import { prisma } from "@/lib/prisma";
import { computeWeeklyRecap, deriveLoggedDates, type HabitWithLogs } from "@/lib/stats";
import { expandDateRange, prevDay, todayInTz } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { renderWeeklyRecapEmail } from "@/lib/weeklyRecapEmail";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Déclenché par un CronJob k8s (k8s/weekly-recap-cronjob.yaml), hebdomadaire.
 * Protégé par CRON_SECRET — jamais public. No-op propre (skip, pas d'erreur)
 * tant que AUTH_RESEND_KEY n'est pas configurée (voir lib/email.ts).
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Fenêtre large (9 jours) bornant la requête indépendamment du fuseau exact
  // de chaque user — le filtrage précis des 7 jours se fait dans computeWeeklyRecap.
  let cutoff = todayInTz("UTC");
  for (let i = 0; i < 9; i++) cutoff = prevDay(cutoff);

  const users = await prisma.user.findMany({
    where: { plan: "PRO" },
    include: {
      habits: {
        // QUIT ne produit plus de HabitLog (Phase 2 roadmap) : mélangée aux
        // formules BUILD, elle gonflerait le dénominateur du récap sans jamais
        // contribuer au numérateur.
        where: { archivedAt: null, type: "BUILD" },
        include: {
          logs: { where: { date: { gte: cutoff } }, select: { date: true, value: true } },
          pauses: { select: { from: true, to: true } },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.habits.length === 0) {
      skipped++;
      continue;
    }

    const today = todayInTz(user.timezone);
    const habits: HabitWithLogs[] = user.habits.map((h) => ({
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      type: h.type,
      goal: h.goal,
      position: h.position,
      loggedDates: deriveLoggedDates(h.logs, h.targetValue),
      pausedDates: new Set(h.pauses.flatMap((p) => expandDateRange(p.from, p.to))),
    }));

    const recap = computeWeeklyRecap(habits, today);
    if (recap.completed === 0) {
      skipped++; // semaine totalement vide : pas de spam
      continue;
    }

    const { subject, html } = renderWeeklyRecapEmail(recap, APP_URL);
    const result = await sendEmail({ to: user.email, subject, html });
    if (result.ok) sent++;
    else skipped++;
  }

  return Response.json({ sent, skipped, total: users.length });
}
