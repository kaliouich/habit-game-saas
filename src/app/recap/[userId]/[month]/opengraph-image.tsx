import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { isValidMonthKey, daysInMonth, pad2, monthLabel } from "@/lib/dates";
import { computeMonthStats, deriveLoggedDates } from "@/lib/stats";
import { APP_NAME } from "@/lib/config";

export const alt = "Habitcade monthly recap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ userId: string; month: string }>;
}

/**
 * Rend le récap partageable comme une IMAGE, pas seulement un lien : la
 * plupart des surfaces où ce lien atterrit (iMessage, WhatsApp, Discord,
 * Slack, Twitter/X) dépliquent automatiquement l'og:image d'une URL — ce
 * fichier EST cette image, régénérée à la volée à partir des vraies stats
 * du mois. Même convention Next que le opengraph-image.tsx racine (marketing).
 */
export default async function Image({ params }: Props) {
  const { userId, month } = await params;

  const fallback = () =>
    new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b0f18" }} />
      ),
      { ...size },
    );

  if (!isValidMonthKey(month)) return fallback();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, plan: true, weekStartsOn: true },
  });
  if (!user || user.plan !== "PRO") return fallback();

  const monthEnd = `${month}-${pad2(daysInMonth(month))}`;

  const habitRows = await prisma.habit.findMany({
    where: {
      userId,
      type: "BUILD",
      OR: [{ archivedAt: null }, { archivedAt: { gt: new Date(`${monthEnd}T23:59:59Z`) } }],
    },
    include: { logs: { where: { date: { gte: `${month}-01`, lte: monthEnd } }, select: { date: true, value: true } } },
    orderBy: { position: "asc" },
    take: 5,
  });

  const habits = habitRows.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    type: h.type as "BUILD" | "QUIT",
    goal: h.goal,
    position: h.position,
    loggedDates: deriveLoggedDates(h.logs, h.targetValue),
  }));

  const today = monthEnd;
  const weekStartsOn: 0 | 1 = user.weekStartsOn === 0 ? 0 : 1;
  const stats = computeMonthStats({ month, habits, moods: [], today, weekStartsOn });
  const pct = Math.round(stats.overallPct * 100);
  const totalDays = daysInMonth(month);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b0f18",
          color: "#e8ecf4",
          fontFamily: "sans-serif",
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            {APP_NAME.toUpperCase()}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#8a94a8" }}>{monthLabel(month)}</div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 40 }}>
          <div style={{ display: "flex", fontSize: 120, fontWeight: 700, color: "#4a9edb" }}>{pct}%</div>
          <div style={{ display: "flex", fontSize: 26, color: "#8a94a8" }}>
            {stats.completedTotal} / {stats.goalTotal} habit-days completed
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 44 }}>
          {habits.map((h) => {
            const hpct = Math.round((h.loggedDates.size / totalDays) * 100);
            return (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", width: 280, fontSize: 24, fontWeight: 600 }}>
                  {h.emoji ?? "✅"} {h.name}
                </div>
                <div style={{ display: "flex", flex: 1, height: 14, background: "#171e2e", borderRadius: 7 }}>
                  <div style={{ display: "flex", width: `${hpct}%`, height: "100%", background: "#4a9edb", borderRadius: 7 }} />
                </div>
                <div style={{ display: "flex", width: 70, fontSize: 22, color: "#8a94a8", justifyContent: "flex-end" }}>
                  {hpct}%
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 20, color: "#7d879c" }}>
          {user.name ? `${user.name}'s` : "My"} month, tracked like a game — habitcade.com
        </div>
      </div>
    ),
    { ...size },
  );
}
