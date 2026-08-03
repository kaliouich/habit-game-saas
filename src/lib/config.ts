/** Nom produit — jamais hardcodé ailleurs (AGENTS.md règle 8). */
export const APP_NAME = "Habit Game";

export const PLAN_LIMITS = {
  FREE: { maxHabits: 5, historyMonths: 0 }, // 0 = mois courant uniquement
  PRO: { maxHabits: Infinity, historyMonths: Infinity },
} as const;

/**
 * Skins cosmétiques du board (couleur de coche + accent) — Sprint 6. Zéro coût
 * marginal (CSS pur), 2 gratuits + 6 pro, tiers appliqués côté serveur dans
 * lib/actions/settings.ts. Les 6 pro reprennent les palettes des 5 directions
 * explorées pour la landing page (voir PRO-PLAN.md).
 */
/**
 * Thèmes d'encre (Sprint 7). L'encre de base — #1f2530 — est échantillonnée
 * directement sur la vidéo de spec : un noir biaisé bleu (B > V > R à chaque
 * palier), pas le #111111 neutre utilisé jusqu'ici.
 *
 * Deux familles : « ink » garde cette encre et ne change que l'accent ;
 * « stamp » colore l'encre elle-même, comme un vrai tampon encreur.
 *
 * Les valeurs doivent rester synchro avec les blocs .dashboard[data-skin=…]
 * de globals.css — ici ce sont les pastilles du picker, là-bas le rendu réel.
 * La clé du thème gratuit reste "classic" : c'est le @default du schéma, donc
 * aucune migration n'est nécessaire.
 */
export const BOARD_SKINS = [
  // ── Gratuit : imposé à tout le monde sur le plan Free ──
  { key: "classic", label: "Ink & Amber", check: "#c8901f", accent: "#d9a227", tier: "free" },

  // ── Pro — encre vidéo, accent coloré ──
  { key: "forest", label: "Ink & Forest", check: "#2e7d5b", accent: "#2e7d5b", tier: "pro" },
  { key: "coral", label: "Ink & Coral", check: "#d9503f", accent: "#e0674f", tier: "pro" },
  { key: "teal", label: "Ink & Teal", check: "#1f8a8a", accent: "#24a0a0", tier: "pro" },

  // ── Pro — encre colorée (tampon) ──
  { key: "royal", label: "Royal Blue ink", check: "#1b3a6b", accent: "#d9a227", tier: "pro" },
  { key: "oxblood", label: "Oxblood ink", check: "#6b1f28", accent: "#c8901f", tier: "pro" },
  { key: "pine", label: "Forest ink", check: "#1e4032", accent: "#b08d3f", tier: "pro" },
  { key: "violet", label: "Violet ink", check: "#3e2a6b", accent: "#e0a82e", tier: "pro" },
] as const;

export type BoardSkinKey = (typeof BOARD_SKINS)[number]["key"];

/** Thème imposé au plan Free (et repli pour toute valeur inconnue en base). */
export const DEFAULT_BOARD_SKIN: BoardSkinKey = "classic";

/**
 * Thème réellement appliqué au rendu. Couvre deux cas que la valeur brute en
 * base ne couvre pas :
 *  - clé héritée d'une ancienne version (arcade, riso, …) → repli ;
 *  - utilisateur Pro repassé en Free → on force le thème gratuit sans toucher
 *    à sa préférence, qu'il retrouvera s'il se réabonne.
 */
export function resolveBoardSkin(stored: string, plan: "FREE" | "PRO"): BoardSkinKey {
  const skin = BOARD_SKINS.find((s) => s.key === stored);
  if (!skin) return DEFAULT_BOARD_SKIN;
  if (skin.tier === "pro" && plan !== "PRO") return DEFAULT_BOARD_SKIN;
  return skin.key;
}

/**
 * Don libre (Sprint 6) — one-off, hors abonnement Pro. Les presets ne sont que
 * des raccourcis d'UI : le montant réel est libre, borné par MIN/MAX et
 * revalidé côté serveur (actions/billing.ts). MIN ≥ 1 € couvre le minimum
 * Stripe (0,50 €) ; MAX borne les fautes de frappe (200 au lieu de 20).
 */
export const DONATION_PRESETS = [3, 5, 10, 25] as const;
export const DONATION_MIN = 1;
export const DONATION_MAX = 500;

/**
 * Rangs guerriers dérivés du niveau (XP) — purement cosmétique et calculé à
 * l'affichage, comme les badges : rien à persister, donc rien à désynchroniser.
 */
export const RANKS = [
  { key: "recruit", label: "Recruit", emblem: "🗡️", minLevel: 1 },
  { key: "squire", label: "Squire", emblem: "🛡️", minLevel: 3 },
  { key: "warrior", label: "Warrior", emblem: "⚔️", minLevel: 6 },
  { key: "knight", label: "Knight", emblem: "🏹", minLevel: 10 },
  { key: "champion", label: "Champion", emblem: "🏆", minLevel: 16 },
  { key: "warlord", label: "Warlord", emblem: "👑", minLevel: 25 },
  { key: "legend", label: "Legend", emblem: "🐉", minLevel: 40 },
] as const;

/**
 * Streak Shields (Sprint 7) — un jour manqué est absorbé au lieu de casser la
 * série. Mécanique Duolingo « streak freeze » : -21 % de churn sur les users à
 * risque. Recharge au 1er du mois, quota selon le plan.
 */
export const SHIELDS_PER_MONTH = { FREE: 1, PRO: 3 } as const;

export const MOODS = [
  { value: 1, emoji: "😞", label: "Awful" },
  { value: 2, emoji: "😕", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;
