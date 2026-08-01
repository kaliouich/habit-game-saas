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
export const BOARD_SKINS = [
  { key: "classic", label: "Classic", check: "#e8b93c", accent: "#e8b93c", tier: "free" },
  { key: "mono", label: "Mono", check: "#3a3a3a", accent: "#6b6b68", tier: "free" },
  // Les valeurs doivent rester synchro avec les blocs .dashboard[data-skin=…]
  // de globals.css — ici ce sont les pastilles du picker, là-bas le rendu réel.
  { key: "arcade", label: "Arcade Gold", check: "#ffc61a", accent: "#f0478a", tier: "pro" },
  { key: "sunset", label: "Sunset", check: "#e0603f", accent: "#2fa58a", tier: "pro" },
  { key: "atlas", label: "Atlas Teal", check: "#1f4d45", accent: "#9a7629", tier: "pro" },
  { key: "ledger", label: "Ledger Red", check: "#b03a24", accent: "#a8760f", tier: "pro" },
  { key: "riso", label: "Riso Pink", check: "#ff3d9a", accent: "#1b45d8", tier: "pro" },
  { key: "signal", label: "Signal Amber", check: "#d2801f", accent: "#8a4a16", tier: "pro" },
] as const;

export type BoardSkinKey = (typeof BOARD_SKINS)[number]["key"];

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
