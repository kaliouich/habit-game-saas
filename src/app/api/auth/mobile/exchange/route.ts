import { consumeMobileAuthCode } from "@/lib/mobileAuthCode";
import { createMobileSession, SESSION_COOKIE_NAME } from "@/lib/mobileSession";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Appelée depuis l'intérieur de la WebView (pont de session mobile, voir
 * MOBILE_SETUP.md) : non authentifiée par nature, c'est elle qui établit la
 * session. Le Set-Cookie de la réponse atterrit dans le jar de la WebView —
 * c'est tout l'intérêt du pont, le Custom Tab et la WebView ayant des jars
 * séparés.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(
    `mobile-auth-exchange:${ip}`,
    RATE_LIMITS.mobileAuthExchange.limit,
    RATE_LIMITS.mobileAuthExchange.windowMs,
  );
  if (!rl.ok) {
    return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : null;
  if (!code) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  // Ne distingue volontairement pas "jamais existé" / "expiré" / "déjà
  // utilisé" — voir mobileAuthCode.ts.
  const consumed = await consumeMobileAuthCode(code);
  if (!consumed) {
    return Response.json({ error: "INVALID_OR_EXPIRED_CODE" }, { status: 400 });
  }

  const { sessionToken, expires } = await createMobileSession(consumed.userId);

  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires.toUTCString()}`,
  );
  return res;
}
