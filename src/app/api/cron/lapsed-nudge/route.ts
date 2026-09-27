import { prisma } from "@/lib/prisma";
import { prevDay, todayInTz } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { renderLapsedNudgeEmail } from "@/lib/lapsedNudgeEmail";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Nombre de jours d'inactivité avant relance — voir DAYS_SINCE ci-dessous
 *  pour pourquoi ce seuil ne se redéclenche qu'une fois. */
const LAPSE_DAYS = 3;

/**
 * Déclenché par un CronJob k8s (k8s/lapsed-nudge-cronjob.yaml), quotidien.
 * Protégé par CRON_SECRET — jamais public. No-op propre (skip, pas d'erreur)
 * tant que AUTH_RESEND_KEY n'est pas configurée (voir lib/email.ts).
 *
 * Contrairement au récap hebdomadaire (Pro uniquement, voir weekly-recap/),
 * cette relance vise TOUS les plans : elle répond au trou d'instrumentation
 * relevé dans l'audit User/CEO/Investor — sans elle, un utilisateur FREE ou
 * PRO qui décroche ne reçoit jamais de signal serveur pour revenir (les
 * rappels natifs, voir lib/notifications.ts, ne couvrent que qui a déjà
 * activé un rappel ET ouvre l'app native, jamais un utilisateur web).
 *
 * Pas de nouveau champ "lastNudgeSentAt" pour éviter le spam : on ne relance
 * QUE le jour où l'écart devient exactement LAPSE_DAYS — le lendemain, sans
 * nouveau log, l'écart passe à LAPSE_DAYS+1 et ne matche plus. Un utilisateur
 * qui recoche quelque chose entre-temps repousse sa propre date de plus
 * récent log, donc sort de la fenêtre de lui-même — aucun état à nettoyer.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { habits: { some: { archivedAt: null, type: "BUILD" } } },
    select: {
      id: true,
      email: true,
      timezone: true,
      habits: {
        where: { archivedAt: null, type: "BUILD" },
        select: {
          logs: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const lastLogDates = user.habits.flatMap((h) => h.logs.map((l) => l.date));
    if (lastLogDates.length === 0) {
      skipped++; // jamais coché une seule fois : la relance de lancement (onboarding) suffit
      continue;
    }
    const lastLogDate = lastLogDates.sort().at(-1)!;

    let target = todayInTz(user.timezone);
    for (let i = 0; i < LAPSE_DAYS; i++) target = prevDay(target);

    if (lastLogDate !== target) {
      skipped++;
      continue;
    }

    const { subject, html } = renderLapsedNudgeEmail(LAPSE_DAYS, APP_URL);
    const result = await sendEmail({ to: user.email, subject, html });
    if (result.ok) sent++;
    else skipped++;
  }

  return Response.json({ sent, skipped, total: users.length });
}
