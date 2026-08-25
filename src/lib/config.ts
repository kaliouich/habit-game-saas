/** Nom produit — jamais hardcodé ailleurs (AGENTS.md règle 8). */
export const APP_NAME = "Habit Game";

export const PLAN_LIMITS = {
  FREE: { maxHabits: 5, historyMonths: 0 }, // 0 = mois courant uniquement
  PRO: { maxHabits: Infinity, historyMonths: Infinity },
} as const;

/**
 * Thèmes du board (Midnight rebuild). L'ancienne famille "encre" (papier
 * clair désaturé, 8 skins) est retirée — remplacée par une seule base sombre
 * partagée (navy profond, voir .dashboard dans globals.css) déclinée en 6
 * paires check/accent. "midnight" reste la clé gratuite pour ne pas casser
 * les valeurs déjà stockées côté user (resolveBoardSkin retombe dessus de
 * toute façon pour toute clé inconnue, donc aucune migration n'est requise).
 *
 * Les valeurs doivent rester synchro avec les blocs .dashboard[data-skin=…]
 * de globals.css — ici ce sont les pastilles du picker, là-bas le rendu réel.
 */
export const BOARD_SKINS = [
  // ── Gratuit : imposé à tout le monde sur le plan Free ──
  { key: "midnight", label: "Midnight", check: "#4a9edb", accent: "#7c6cf0", tier: "free" },

  // ── Pro ──
  { key: "aurora", label: "Aurora", check: "#21c5a8", accent: "#4a9edb", tier: "pro" },
  { key: "ember", label: "Ember", check: "#f5b93d", accent: "#e5544b", tier: "pro" },
  { key: "orchid", label: "Orchid", check: "#b47ce8", accent: "#e85ca0", tier: "pro" },
  { key: "lime", label: "Lime", check: "#6bcb4b", accent: "#21c5a8", tier: "pro" },
  { key: "crimson", label: "Crimson", check: "#e5544b", accent: "#f5b93d", tier: "pro" },
] as const;

export type BoardSkinKey = (typeof BOARD_SKINS)[number]["key"];

/** Thème imposé au plan Free (et repli pour toute valeur inconnue en base). */
export const DEFAULT_BOARD_SKIN: BoardSkinKey = "midnight";

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

/**
 * Durée maximale d'une pause (vacation mode), bornes incluses.
 * Sans cette borne, une pause 1970 → 2999 rendait toute série définitivement
 * incassable — la mécanique de jeu entière contournée en un seul appel — et
 * faisait expanser des milliers de dates par habitude à chaque rendu du
 * dashboard. 90 jours couvre très largement le cas d'usage réel (congés).
 */
export const MAX_PAUSE_DAYS = 90;

export const MOODS = [
  { value: 1, emoji: "😞", label: "Awful" },
  { value: 2, emoji: "😕", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;

/**
 * Phase 1 roadmap (socle quantifié). TIMES reste la case à cocher classique
 * (pas d'input supplémentaire) ; les autres unités affichent un stepper dans
 * la grille (DayValueCell) — `step` = incrément par clic, `defaultTarget` =
 * cible pré-remplie à la création (l'utilisateur peut l'ajuster).
 */
export const HABIT_UNITS = [
  { key: "TIMES", label: "Check", suffix: "", step: 1, defaultTarget: 1 },
  { key: "COUNT", label: "Count", suffix: "", step: 1, defaultTarget: 1 },
  { key: "MINUTES", label: "Minutes", suffix: "min", step: 5, defaultTarget: 30 },
  { key: "HOURS", label: "Hours", suffix: "h", step: 0.5, defaultTarget: 1 },
  { key: "STEPS", label: "Steps", suffix: "steps", step: 1000, defaultTarget: 10000 },
  { key: "KM", label: "Kilometers", suffix: "km", step: 1, defaultTarget: 5 },
  { key: "CALORIES", label: "Calories", suffix: "cal", step: 100, defaultTarget: 500 },
] as const;

export type HabitUnitKey = (typeof HABIT_UNITS)[number]["key"];

export function habitUnitConfig(key: string): (typeof HABIT_UNITS)[number] {
  return HABIT_UNITS.find((u) => u.key === key) ?? HABIT_UNITS[0];
}
