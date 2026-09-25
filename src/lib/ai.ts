import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { HabitDraft } from "./onboardingCatalog";

const globalForAi = globalThis as unknown as { anthropic?: Anthropic };

/** Même raison que getStripeClient (src/lib/stripe.ts) : instanciation
 *  paresseuse, la clé n'est configurée qu'une fois ANTHROPIC_API_KEY posée
 *  dans le Secret k8s — tant que ce n'est pas fait, l'app ne doit pas planter
 *  à l'import, seulement quand ce chemin précis est réellement appelé. */
function getAnthropicClient(): Anthropic {
  if (!globalForAi.anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    globalForAi.anthropic = new Anthropic({ apiKey });
  }
  return globalForAi.anthropic;
}

export function isAiOnboardingConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Réponses tap-only du sondage (plus de texte libre — voir GoalScreen). */
export interface GoalSurveyInput {
  goal: string;
  scope: string;
  obstacle: string;
  timeBudget: string;
}

const SuggestedHabitSchema = z.object({
  name: z.string().min(1).max(40),
  emoji: z.string().min(1).max(8),
  type: z.enum(["BUILD", "QUIT"]),
  unit: z.enum(["TIMES", "MINUTES", "HOURS", "COUNT", "STEPS", "KM", "CALORIES"]),
  targetValue: z.number().positive().max(1_000_000).nullable(),
  unitLabel: z.string().max(20).nullable(),
  rationale: z.string().min(1).max(160),
});

const SuggestedHabitsSchema = z.object({
  // Le "levier quotidien" décrit dans la lettre de Dan Koe : un jalon concret
  // à 30 jours, une phrase, avant même de choisir les habitudes — sans lui
  // les habitudes ne sont qu'une liste générique de bien-être. Affiché tel
  // quel en haut de l'écran Review ("Your first quest: …").
  milestone: z.string().min(1).max(140),
  habits: z.array(SuggestedHabitSchema).min(3).max(6),
});

/**
 * Périmètre volontairement étroit : uniquement de petites habitudes
 * quotidiennes sûres, jamais un avis médical/thérapeutique. Le choix "Feel
 * less anxious or stressed" du sondage (voir GoalScreen) est la seule entrée
 * émotionnellement chargée possible désormais — plus de texte libre, donc
 * plus besoin de deviner quelles phrases "comptent" comme sensibles, mais la
 * consigne de douceur reste, et le disclaimer visible dans Review (composant,
 * pas généré ici) reste affiché systématiquement sur ce chemin.
 *
 * Structure inspirée de "daily levers = quests toward a 30-day milestone"
 * (https://letters.thedankoe.com/p/how-to-fix-your-entire-life-in-1) : au
 * lieu de générer des habitudes directement depuis l'objectif (liste
 * générique et interchangeable d'un objectif à l'autre), le modèle choisit
 * D'ABORD un jalon concret à 30 jours, PUIS des habitudes qui sont
 * explicitement les leviers de CE jalon précis — chaque habitude doit avoir
 * une raison d'être qui ne marcherait pas pour un autre jalon.
 */
const SYSTEM_PROMPT = `You turn a person's stated goal into a focused set of daily habits they can track in a habit app.

You receive four short survey answers (not free text): their goal, how big a change they're making (scope), their biggest obstacle, and how much time they can give it daily.

Work in two steps:

STEP 1 — Pick ONE concrete 30-day milestone.
Before suggesting any habit, decide on a single, specific, near-term milestone this person could plausibly reach in 30 days that represents real progress on their goal. Not the goal itself (too big, too vague) — a concrete checkpoint on the way there. Bias its ambition to the stated scope: "small tweak" -> a narrow milestone about one behavior; "new routine" -> a milestone about a small system working reliably; "full reset" -> a milestone marking strong early momentum, not the whole transformation. Write it as one plain sentence, no jargon, the way a person would say it to a friend.

STEP 2 — Choose 3-6 daily habits that are direct levers for THAT milestone.
Every habit must have an obvious, specific line back to the milestone you just wrote — if a habit would make just as much sense for a different milestone, it's too generic, replace it. Number of habits scales with scope: "small tweak" -> exactly 3, "new routine" -> 4-5, "full reset" -> 5-6.

Rules:
- Suggest only small, safe, everyday actions — never medical, therapeutic, or diagnostic advice, and never extreme or restrictive suggestions (crash diets, excessive fasting, over-exercising).
- If the goal is "Feel less anxious or stressed" or similarly emotionally loaded, keep the milestone and habits gentle and evidence-informed (morning sunlight, short walks, journaling, consistent sleep, reaching out to a friend) — never anything that reads as therapy or a diagnosis.
- Each habit needs: a short name (max 40 chars), one emoji, a type (BUILD to start doing something, QUIT to stop/reduce something), a unit (TIMES for a plain daily check, or MINUTES/HOURS/COUNT/STEPS/KM/CALORIES for a quantified target), a sensible targetValue for that unit (null for TIMES), a unitLabel only when unit is COUNT (e.g. "glasses", "pages", else null).
- Each habit's rationale (max ~160 chars, one sentence) must name how it serves the milestone AND respond to the stated obstacle specifically — e.g. if the obstacle is "I just forget," the rationale should mention anchoring it to an existing routine; if "no time," lean on the habit's brevity; if "no motivation," note how small/frictionless it is; if "I don't know where to start," frame it as the concrete first step. Don't write generic wellness-blurb rationale.
- Keep targets realistic for a total beginner, scaled down for shorter stated time budgets.
- Respond only in the requested structure — no extra commentary.`;

export async function generateHabitsFromGoal(
  input: GoalSurveyInput,
): Promise<{ milestone: string; habits: HabitDraft[] }> {
  const client = getAnthropicClient();
  const userMessage = `Goal: ${input.goal}\nScope: ${input.scope}\nBiggest obstacle: ${input.obstacle}\nDaily time available: ${input.timeBudget}`;

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    output_config: { format: zodOutputFormat(SuggestedHabitsSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("AI_PARSE_FAILED");
  }

  return {
    milestone: response.parsed_output.milestone,
    habits: response.parsed_output.habits.map((h) => ({
      name: h.name,
      emoji: h.emoji,
      type: h.type,
      unit: h.unit,
      targetValue: h.targetValue ?? undefined,
      unitLabel: h.unitLabel ?? undefined,
      rationale: h.rationale,
    })),
  };
}
