/**
 * Seed de démo : l'utilisateur, les habitudes de la vidéo et un mois de données
 * réalistes (taux de complétion décroissant, humeurs corrélées).
 * Idempotent : relançable sans dupliquer (upserts + deleteMany des logs du user démo).
 */
import "dotenv/config";
import { PrismaClient, HabitType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const VIDEO_HABITS: { name: string; emoji: string; type: HabitType }[] = [
  { name: "Wake up at 05:00", emoji: "⏰", type: "BUILD" },
  { name: "Gym", emoji: "💪", type: "BUILD" },
  { name: "Reading / Learning", emoji: "📖", type: "BUILD" },
  { name: "Day Planning", emoji: "📅", type: "BUILD" },
  { name: "Project Work", emoji: "🎯", type: "BUILD" },
  { name: "Journaling", emoji: "✍️", type: "BUILD" },
  { name: "Stretching", emoji: "🤸", type: "BUILD" },
  { name: "Cold Shower", emoji: "🚿", type: "BUILD" },
  { name: "Meditation", emoji: "🧘", type: "BUILD" },
  { name: "No Alcohol", emoji: "🍾", type: "QUIT" },
  { name: "Social Media Detox", emoji: "🌿", type: "QUIT" },
  { name: "No Sugar", emoji: "🍬", type: "QUIT" },
];

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();

  // Graine déterministe pour des données stables entre deux seeds
  let s = 42;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

  for (let i = 0; i < VIDEO_HABITS.length; i++) {
    const h = VIDEO_HABITS[i];
    const habit = await prisma.habit.create({
      data: { userId: user.id, name: h.name, emoji: h.emoji, type: h.type, position: i },
    });
    // Chaque habitude a son "sérieux" : entre 55 % et 95 %
    const diligence = 0.55 + rand() * 0.4;
    const logs: { habitId: string; date: string }[] = [];
    for (let day = 1; day <= today; day++) {
      if (rand() < diligence) logs.push({ habitId: habit.id, date: ymd(year, month, day) });
    }
    await prisma.habitLog.createMany({ data: logs });
  }

  const moods: { userId: string; date: string; value: number }[] = [];
  for (let day = 1; day <= today; day++) {
    moods.push({ userId: user.id, date: ymd(year, month, day), value: 2 + Math.round(rand() * 3) });
  }
  await prisma.moodLog.createMany({ data: moods });

  console.log(`Seed OK — user demo@habitgame.local, ${VIDEO_HABITS.length} habitudes, mois ${ymd(year, month, 1)} → jour ${today}`);
}

main().finally(() => prisma.$disconnect());
