import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { isValidMonthKey, daysInMonth, pad2, currentMonth } from "@/lib/dates";
import type { MonthKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

function buildCsv(
  months: MonthKey[],
  habits: { id: string; name: string; emoji: string | null }[],
  logsByDate: Map<string, Set<string>>,
): string {
  const header = ["Date", ...habits.map((h) => `${h.emoji ? h.emoji + " " : ""}${h.name}`)];
  const rows: string[][] = [header];

  for (const month of months) {
    const days = daysInMonth(month);
    for (let d = 1; d <= days; d++) {
      const date = `${month}-${pad2(d)}`;
      const checked = logsByDate.get(date) ?? new Set();
      rows.push([date, ...habits.map((h) => (checked.has(h.id) ? "1" : "0"))]);
    }
  }

  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (user.plan !== "PRO") {
    return Response.json({ error: "PRO plan required for CSV export" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawMonth = searchParams.get("month");
  const current = currentMonth(user.timezone);

  // Determine range: single month param OR all months from first log to current
  let months: MonthKey[];
  if (rawMonth && isValidMonthKey(rawMonth)) {
    months = [rawMonth];
  } else {
    // Fetch earliest log date to build full range
    const earliest = await prisma.habitLog.findFirst({
      where: { habit: { userId: user.id } },
      orderBy: { date: "asc" },
      select: { date: true },
    });
    if (!earliest) {
      months = [current];
    } else {
      const startMonth = earliest.date.slice(0, 7) as MonthKey;
      months = [];
      let m = startMonth;
      while (m <= current) {
        months.push(m);
        const y = Number(m.slice(0, 4));
        const mo = Number(m.slice(5, 7));
        const next = mo === 12 ? `${y + 1}-01` : `${y}-${pad2(mo + 1)}`;
        m = next as MonthKey;
      }
    }
  }

  const [habits, logs] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, emoji: true, position: true },
      orderBy: { position: "asc" },
    }),
    prisma.habitLog.findMany({
      where: {
        habit: { userId: user.id },
        date: { gte: `${months[0]}-01`, lte: `${months[months.length - 1]}-${pad2(daysInMonth(months[months.length - 1]))}` },
      },
      select: { date: true, habitId: true },
    }),
  ]);

  // Build date → Set<habitId> map
  const logsByDate = new Map<string, Set<string>>();
  for (const log of logs) {
    const s = logsByDate.get(log.date) ?? new Set();
    s.add(log.habitId);
    logsByDate.set(log.date, s);
  }

  const csv = buildCsv(months, habits, logsByDate);
  const filename =
    months.length === 1 ? `habit-game-${months[0]}.csv` : `habit-game-all.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
