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
  // Bleu encre + rouge crayon sur papier : le carnet annoté.
  { key: "classic", label: "E-Ink Blue", check: "#37547f", accent: "#a4453c", tier: "free" },

  // ── Pro — toutes désaturées au même niveau que le thème gratuit.
  // Une teinte vive à côté d'une palette e-ink casserait l'illusion de papier.
  { key: "graphite", label: "Graphite", check: "#4a4740", accent: "#7c766d", tier: "pro" },
  { key: "sepia", label: "Sepia", check: "#7a5a3c", accent: "#a4453c", tier: "pro" },
  { key: "forest", label: "Pine", check: "#3d5c48", accent: "#7a5a3c", tier: "pro" },
  { key: "royal", label: "Indigo", check: "#3b3f6b", accent: "#8c6a3f", tier: "pro" },
  { key: "oxblood", label: "Oxblood", check: "#7a3a38", accent: "#37547f", tier: "pro" },
  { key: "teal", label: "Slate Teal", check: "#356b6b", accent: "#a4453c", tier: "pro" },
  { key: "plum", label: "Plum", check: "#5e3f5c", accent: "#7a5a3c", tier: "pro" },
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
