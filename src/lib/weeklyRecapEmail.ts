import type { WeeklyRecap } from "@/lib/stats";
import { APP_NAME } from "@/lib/config";

/** Template HTML simple (pas de dépendance react-email) pour le récap hebdomadaire. */
export function renderWeeklyRecapEmail(recap: WeeklyRecap, appUrl: string): { subject: string; html: string } {
  const pct = Math.round(recap.pct * 100);
  const streakLine = recap.bestStreakHabit
    ? `<p style="margin:0 0 16px;font-size:14px;color:#171717;">🔥 Your longest active streak: <strong>${recap.bestStreakHabit.streak} days</strong> on <strong>${recap.bestStreakHabit.name} ${recap.bestStreakHabit.emoji ?? ""}</strong>.</p>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f4f4f2;">
      <div style="background:#111111;color:#fff;border-radius:10px 10px 0 0;padding:16px 20px;font-weight:700;">
        ${APP_NAME} — Your week in review
      </div>
      <div style="background:#fff;border-radius:0 0 10px 10px;padding:20px;">
        <p style="margin:0 0 16px;font-size:15px;color:#171717;">
          You completed <strong>${recap.completed}</strong> out of <strong>${recap.goal}</strong> checks this week —
          <strong>${pct}%</strong>, active ${recap.daysActive}/7 days.
        </p>
        ${streakLine}
        <a href="${appUrl}/app" style="display:inline-block;background:#111111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Open your dashboard →
        </a>
      </div>
    </div>
  `.trim();

  return { subject: `${APP_NAME}: your week — ${pct}% complete`, html };
}
