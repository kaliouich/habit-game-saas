import { createClient, type RedisClientType } from "redis";

/**
 * Limitation de débit — Valkey partagé si configuré (RATE_LIMIT_REDIS_URL,
 * voir helm/habit-game/templates/valkey.yaml), sinon repli en mémoire du
 * process (comportement historique, correct seulement à `replicas: 1`).
 *
 * Le repli mémoire n'est pas qu'un filet pour la prod : c'est aussi ce qui
 * fait tourner les tests et le dev local sans dépendance Redis — aucune des
 * deux implémentations n'est un mode dégradé "cassé", les deux appliquent la
 * même politique, seule la portée du compteur change (par pod vs partagée).
 *
 * Objectif : empêcher qu'un compte compromis ou un script crée des centaines
 * de sessions Stripe Checkout (chaque appel touche l'API Stripe et crée des
 * objets facturables côté tableau de bord), pas de protéger contre un DDoS —
 * ça, c'est le rôle de Cloudflare en amont.
 */

interface Bucket {
  hits: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Purge opportuniste : sans elle, la Map croît indéfiniment avec le nombre
// d'identités vues (fuite mémoire lente sur un process long).
function sweep(now: number): void {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Secondes avant réinitialisation — utile pour un message utilisateur. */
  retryAfter: number;
}

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.hits++;
  if (bucket.hits > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

const globalForRedis = globalThis as unknown as { rateLimitRedis?: RedisClientType };

/**
 * Client lazy, une seule connexion par process — jamais recréée à chaque
 * appel (voir getStripeClient/getAnthropicClient, même convention). Retourne
 * `null` (jamais ne lève) si RATE_LIMIT_REDIS_URL est absente ou si la
 * connexion échoue : l'appelant retombe alors sur memoryRateLimit plutôt que
 * de faire échouer un checkout parce que Valkey est indisponible.
 */
async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.RATE_LIMIT_REDIS_URL;
  if (!url) return null;

  let client = globalForRedis.rateLimitRedis;
  if (client === undefined) {
    client = createClient({
      url,
      socket: {
        // Sans ceci, le client par défaut retente indéfiniment (backoff
        // exponentiel) une connexion à un hôte injoignable — un premier appel
        // bloquerait la Server Action (checkout, export…) au lieu de retomber
        // vite sur memoryRateLimit comme prévu. reconnectStrategy:false
        // désactive SA boucle de reconnexion auto ; on reconnecte nous-mêmes
        // ci-dessous, à la demande, pour ne pas rester bloqué en repli mémoire
        // indéfiniment après une coupure transitoire de Valkey.
        connectTimeout: 300,
        reconnectStrategy: false,
      },
    });
    client.on("error", () => {
      /* évite un crash process (unhandled 'error') sur une coupure réseau —
         chaque appel vérifie isReady avant usage et retente ci-dessous */
    });
    globalForRedis.rateLimitRedis = client;
  }

  if (!client.isReady && !client.isOpen) {
    try {
      await client.connect();
    } catch {
      return null;
    }
  }
  return client.isReady ? client : null;
}

/**
 * Fenêtre fixe : `limit` requêtes par `windowMs` pour une même clé.
 * @param key identité de l'appelant (userId de préférence — stable et non
 *   falsifiable côté client, contrairement à une IP derrière proxy).
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const redis = await getRedis();
  if (!redis) return memoryRateLimit(key, limit, windowMs);

  try {
    const rkey = `ratelimit:${key}`;
    const hits = await redis.incr(rkey);
    if (hits === 1) {
      await redis.pExpire(rkey, windowMs);
    }
    if (hits > limit) {
      const ttl = await redis.pTTL(rkey);
      return { ok: false, retryAfter: Math.ceil((ttl > 0 ? ttl : windowMs) / 1000) };
    }
    return { ok: true, retryAfter: 0 };
  } catch {
    // Valkey injoignable en cours de route (pas seulement à la connexion) →
    // repli mémoire pour cet appel plutôt que de bloquer l'action utilisateur.
    return memoryRateLimit(key, limit, windowMs);
  }
}

/** Quotas par opération — volontairement larges : un humain ne les atteint pas. */
export const RATE_LIMITS = {
  /** Création de session Stripe Checkout (abonnement ou don). */
  checkout: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Ouverture du portail de facturation Stripe. */
  portal: { limit: 20, windowMs: 60 * 60 * 1000 },
  /** Export CSV : requête lourde (tout l'historique du compte). */
  export: { limit: 20, windowMs: 60 * 60 * 1000 },
  /**
   * Échange du code du pont de session mobile (voir mobileAuthCode.ts).
   * Route non authentifiée par nature (elle établit la session) : clé par IP
   * plutôt que userId, seule exception à la préférence userId ci-dessus —
   * l'identité de l'appelant n'est justement pas encore connue à ce stade.
   * Large volontairement : l'entropie/TTL/usage unique du code fait le
   * vrai travail, cette limite ne freine que le bourrinage scripté.
   */
  mobileAuthExchange: { limit: 10, windowMs: 10 * 60 * 1000 },
  /** Génération d'habitudes par IA (onboarding) : chaque appel est une
   *  requête Claude réellement facturée, contrairement aux autres entrées
   *  ci-dessus qui ne protègent qu'un abus de service gratuit. */
  aiHabitGeneration: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;

/** Remise à zéro — tests uniquement (repli mémoire ; aucune instance Redis en test). */
export function __resetRateLimits(): void {
  buckets.clear();
}
