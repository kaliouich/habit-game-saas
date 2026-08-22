/**
 * Seed de démo : l'utilisateur, les habitudes de la vidéo et un mois de données
 * réalistes (taux de complétion décroissant, humeurs corrélées).
 * Idempotent : relançable sans dupliquer (upserts + deleteMany des logs du user démo).
 */
import "dotenv/config";
import { PrismaClient, HabitType, HabitUnit } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { extractPlainText, parseJournalMarkdown } from "../src/lib/journal";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const VIDEO_HABITS: {
  name: string;
  emoji: string;
  type: HabitType;
  unit?: HabitUnit; // Phase 1 roadmap — absent = TIMES (case à cocher classique)
  targetValue?: number;
  unitLabel?: string;
}[] = [
  { name: "Wake up at 05:00", emoji: "⏰", type: "BUILD" },
  { name: "Gym", emoji: "💪", type: "BUILD" },
  { name: "Reading / Learning", emoji: "📖", type: "BUILD" },
  { name: "Day Planning", emoji: "📅", type: "BUILD" },
  { name: "Project Work", emoji: "🎯", type: "BUILD" },
  { name: "Journaling", emoji: "✍️", type: "BUILD" },
  { name: "Stretching", emoji: "🤸", type: "BUILD" },
  { name: "Cold Shower", emoji: "🚿", type: "BUILD" },
  { name: "Meditation", emoji: "🧘", type: "BUILD" },
  { name: "Steps", emoji: "🚶", type: "BUILD", unit: "STEPS", targetValue: 10000 },
  { name: "Drink Water", emoji: "💧", type: "BUILD", unit: "COUNT", targetValue: 8, unitLabel: "glasses" },
  { name: "No Alcohol", emoji: "🍾", type: "QUIT" },
  { name: "Social Media Detox", emoji: "🌿", type: "QUIT" },
  { name: "No Sugar", emoji: "🍬", type: "QUIT" },
];

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Phase 2 roadmap : historique de démo par habitude QUIT, indépendant des
 *  HabitLog (elle n'en produit plus). `createdAt` simule une abstinence
 *  entamée avant aujourd'hui ; `relapses` (avant maintenant) créent un record
 *  différent de la série en cours, pour montrer les deux états du compteur. */
const QUIT_DEMO: Record<string, { createdAt: Date; relapses: Date[] }> = {
  "No Alcohol": { createdAt: daysAgo(35), relapses: [] }, // record = série en cours
  "Social Media Detox": { createdAt: daysAgo(40), relapses: [daysAgo(8)] }, // record (32j) ≠ série en cours (8j)
  "No Sugar": { createdAt: daysAgo(5), relapses: [] },
};

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@habitgame.local" },
    update: {},
    create: {
      email: "demo@habitgame.local",
      name: "Demo",
      plan: "PRO",
    },
  });

  // Repart d'un état propre pour le user démo
  await prisma.habit.deleteMany({ where: { userId: user.id } });
  await prisma.moodLog.deleteMany({ where: { userId: user.id } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.journalEntry.deleteMany({ where: { userId: user.id } });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();

  // Graine déterministe pour des données stables entre deux seeds
  let s = 42;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

  const habitByName = new Map<string, string>(); // pour lier les tâches/entrées de journal ci-dessous

  for (let i = 0; i < VIDEO_HABITS.length; i++) {
    const h = VIDEO_HABITS[i];

    if (h.type === "QUIT") {
      const demo = QUIT_DEMO[h.name] ?? { createdAt: new Date(), relapses: [] };
      const habit = await prisma.habit.create({
        data: {
          userId: user.id,
          name: h.name,
          emoji: h.emoji,
          type: h.type,
          position: i,
          createdAt: demo.createdAt,
          quitStartedAt: demo.relapses.length > 0 ? demo.relapses[demo.relapses.length - 1] : demo.createdAt,
        },
      });
      if (demo.relapses.length > 0) {
        await prisma.habitRelapse.createMany({
          data: demo.relapses.map((occurredAt) => ({ habitId: habit.id, occurredAt })),
        });
      }
      habitByName.set(h.name, habit.id);
      continue;
    }

    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        name: h.name,
        emoji: h.emoji,
        type: h.type,
        position: i,
        unit: h.unit ?? "TIMES",
        targetValue: h.targetValue ?? null,
        unitLabel: h.unitLabel ?? null,
      },
    });
    // Chaque habitude a son "sérieux" : entre 55 % et 95 %
    const diligence = 0.55 + rand() * 0.4;
    const logs: { habitId: string; date: string; value: number }[] = [];
    for (let day = 1; day <= today; day++) {
      if (rand() < diligence) {
        // Quantifiée : valeur réaliste autour de la cible (parfois sous, parfois dépassée).
        // TIMES : toujours 1 (équivalent de l'ancien `completed: true`).
        const value = h.targetValue ? Math.round(h.targetValue * (0.5 + rand() * 0.9)) : 1;
        logs.push({ habitId: habit.id, date: ymd(year, month, day), value });
      }
    }
    await prisma.habitLog.createMany({ data: logs });
    habitByName.set(h.name, habit.id);
  }

  const gymId = habitByName.get("Gym");
  const stepsId = habitByName.get("Steps");
  const todayStr = ymd(year, month, today);
  const yesterdayStr = ymd(year, month, Math.max(1, today - 1));

  // Phase 4 roadmap (tâches minimales)
  await prisma.task.createMany({
    data: [
      { userId: user.id, title: "Buy groceries for next week", dueDate: todayStr, priority: true, position: 0 },
      { userId: user.id, title: "Schedule dentist appointment", dueDate: todayStr, position: 1 },
      { userId: user.id, title: "Reply to urgent emails", dueDate: yesterdayStr, priority: true, position: 2 },
      { userId: user.id, title: "Review monthly budget", dueDate: null, position: 3 },
    ],
  });

  // Phase 3 roadmap (journal) — contenu structuré (lib/journal.ts), pas de HTML brut
  const entry1 = parseJournalMarkdown("**Great** workout today, felt *strong* on the last set");
  const entry2 = parseJournalMarkdown("- [x] Morning walk\n- [x] Stretching\n- [ ] Evening run");
  await prisma.journalEntry.createMany({
    data: [
      {
        userId: user.id,
        habitId: gymId ?? null,
        date: todayStr,
        title: "Rise and shine",
        content: entry1 as object,
        searchText: extractPlainText(entry1),
      },
      {
        userId: user.id,
        habitId: stepsId ?? null,
        date: yesterdayStr,
        title: null,
        content: entry2 as object,
        searchText: extractPlainText(entry2),
      },
    ],
  });

  const moods: { userId: string; date: string; value: number }[] = [];
  for (let day = 1; day <= today; day++) {
    moods.push({ userId: user.id, date: ymd(year, month, day), value: 2 + Math.round(rand() * 3) });
  }
  await prisma.moodLog.createMany({ data: moods });

  console.log(`Seed OK — user demo@habitgame.local, ${VIDEO_HABITS.length} habitudes, mois ${ymd(year, month, 1)} → jour ${today}`);
}

main().finally(() => prisma.$disconnect());
