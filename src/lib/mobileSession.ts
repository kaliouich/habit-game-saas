import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Nom du cookie de session Auth.js v5 en prod (https, useSecureCookies).
 * Reconstruit depuis node_modules/@auth/core/lib/utils/cookie.js — pas une
 * API publique de ce package (encore en beta). src/lib/auth.ts ne surcharge
 * jamais `cookies.sessionToken`, donc c'est la valeur par défaut réelle.
 * À revérifier à chaque montée de version de next-auth/@auth/core.
 */
export const SESSION_COOKIE_NAME = "__Secure-authjs.session-token";

/**
 * 30 jours : valeur par défaut de `session.maxAge` dans @auth/core
 * (node_modules/@auth/core/lib/init.js), non surchargée dans src/lib/auth.ts.
 * Si ce fichier définit un jour `session.maxAge` explicite, garder cette
 * constante synchronisée.
 */
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Stratégie "database" d'Auth.js v5 : la valeur du cookie de session est un
 * jeton opaque NON signé, comparé tel quel à Session.sessionToken — pas de
 * JWT à reproduire ici (confirmé dans @auth/core/lib/actions/callback/handle-login.js).
 */
export async function createMobileSession(userId: string): Promise<{ sessionToken: string; expires: Date }> {
  const sessionToken = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await prisma.session.create({ data: { sessionToken, userId, expires } });
  return { sessionToken, expires };
}
