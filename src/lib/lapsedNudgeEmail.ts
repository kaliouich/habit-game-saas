import { APP_NAME } from "@/lib/config";

/** Template HTML simple (même convention que weeklyRecapEmail.ts) — relance
 *  douce, jamais culpabilisante : un rappel, pas une accusation. */
export function renderLapsedNudgeEmail(daysSince: number, appUrl: string): { subject: string; html: string } {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f4f4f2;">
      <div style="background:#111111;color:#fff;border-radius:10px 10px 0 0;padding:16px 20px;font-weight:700;">
        ${APP_NAME}
      </div>
      <div style="background:#fff;border-radius:0 0 10px 10px;padding:20px;">
        <p style="margin:0 0 16px;font-size:15px;color:#171717;">
          It's been ${daysSince} days since your last check-in — no pressure, just a nudge before it slips your mind entirely.
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:#525252;">
          Your habits and streak history are exactly where you left them.
        </p>
        <a href="${appUrl}/app" style="display:inline-block;background:#111111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Pick back up →
        </a>
      </div>
    </div>
  `.trim();

  return { subject: `${APP_NAME}: still there?`, html };
}
