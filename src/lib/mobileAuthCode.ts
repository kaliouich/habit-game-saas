import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Pont de session Google natif (Custom Tabs → WebView) — voir MOBILE_SETUP.md.
 * Le Custom Tab (jar de cookies séparé de la WebView) échange ce code contre
 * une vraie Session via /api/auth/mobile/exchange. 2 minutes suffisent pour
 * couvrir la latence de la redirection + du deep link, et rendent un code
 * fuité/loggé inutile en pratique.
 *
 * Schéma custom (habitgame://, voir AndroidManifest.xml) plutôt qu'Android
 * App Links : pas de keystore de signature release pour l'instant, donc pas
 * de fingerprint stable pour assetlinks.json. À reconsidérer si un keystore
 * release existe un jour — changement d'intent-filter + d'URL de redirection
 * dans bridge/route.ts uniquement, rien d'autre à toucher.
 */
export const MOBILE_AUTH_CODE_TTL_MS = 2 * 60 * 1000;

function generateMobileAuthCode(): string {
  return randomBytes(32).toString("base64url");
}

export async function mintMobileAuthCode(userId: string): Promise<string> {
  const code = generateMobileAuthCode();
  await prisma.mobileAuthCode.create({
    data: { code, userId, expiresAt: new Date(Date.now() + MOBILE_AUTH_CODE_TTL_MS) },
  });
  return code;
}

/**
 * Consommation atomique (updateMany, pas lecture-puis-écriture) : ferme la
 * course entre deux échanges quasi simultanés sur le même code. `null` ne
 * distingue pas "jamais existé" / "expiré" / "déjà utilisé" — distinguer ces
 * cas laisserait un attaquant sondant des codes apprendre lesquels ont existé.
 */
export async function consumeMobileAuthCode(code: string): Promise<{ userId: string } | null> {
  const result = await prisma.mobileAuthCode.updateMany({
    where: { code, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (result.count === 0) return null;

  const row = await prisma.mobileAuthCode.findUnique({ where: { code }, select: { userId: true } });
  return row;
}
