/**
 * Limitation de débit en mémoire, par processus.
 *
 * ⚠️ Portée : le compteur vit dans le pod. Le déploiement tourne avec
 * `replicas: 1` (voir helm/habit-game/values.yaml), donc la limite est
 * effective aujourd'hui. **Passer à plusieurs replicas la diviserait d'autant**
 * — il faudra alors un store partagé (Redis/Valkey, déjà présent dans le
 * cluster pour Gitea) plutôt que cette Map.
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

/**
 * Fenêtre fixe : `limit` requêtes par `windowMs` pour une même clé.
 * @param key identité de l'appelant (userId de préférence — stable et non
 *   falsifiable côté client, contrairement à une IP derrière proxy).
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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
} as const;

/** Remise à zéro — tests uniquement. */
export function __resetRateLimits(): void {
  buckets.clear();
}
