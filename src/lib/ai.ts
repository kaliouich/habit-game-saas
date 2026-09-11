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

const SuggestedHabitSchema = z.object({
  name: z.string().min(1).max(40),
  emoji: z.string().min(1).max(8),
  type: z.enum(["BUILD", "QUIT"]),
  unit: z.enum(["TIMES", "MINUTES", "HOURS", "COUNT", "STEPS", "KM", "CALORIES"]),
  targetValue: z.number().positive().max(1_000_000).nullable(),
  unitLabel: z.string().max(20).nullable(),
  rationale: z.string().min(1).max(140),
});

const SuggestedHabitsSchema = z.object({
  habits: z.array(SuggestedHabitSchema).min(3).max(6),
});

/**
 * Périmètre volontairement étroit : uniquement de petites habitudes
 * quotidiennes sûres, jamais un avis médical/thérapeutique. Pour une entrée
 * chargée émotionnellement ("sortir de ma dépression", "fixer ma vie"), le
 * modèle est orienté vers des actions de bien-être douces et documentées
 * (lumière du matin, marche, journaling, sommeil, lien social) — PAS un
 * substitut à un suivi professionnel. Le disclaimer visible dans l'écran
 * Review (composant, pas généré ici) est affiché systématiquement sur ce
 * chemin, indépendamment de ce que répond le modèle : plus simple et plus
 * fiable que de classifier quelles entrées "comptent" comme sensibles.
 */
const SYSTEM_PROMPT = `You help people turn a goal or a struggle, described in their own words, into 3-6 small, concrete daily habits they can track in a habit app.

Rules:
- Suggest only small, safe, everyday actions — never medical, therapeutic, or diagnostic advice, and never extreme or restrictive suggestions (crash diets, excessive fasting, over-exercising).
- If the input describes something emotionally heavy (depression, anxiety, burnout, "fix my life," grief, etc.), respond with gentle, evidence-informed wellness habits — morning sunlight, short walks, journaling, consistent sleep, reaching out to a friend — never anything that reads as therapy or a diagnosis.
- Each habit needs: a short name (max 40 chars), one emoji, a type (BUILD to start doing something, QUIT to stop/reduce something), a unit (TIMES for a plain daily check, or MINUTES/HOURS/COUNT/STEPS/KM/CALORIES for a quantified target), a sensible targetValue for that unit (null for TIMES), a unitLabel only when unit is COUNT (e.g. "glasses", "pages", else null), and a one-sentence rationale explaining why this habit helps with what they described.
- Keep targets realistic for a total beginner, not an ambitious daily maximum.
- Respond only in the requested structure — no extra commentary.`;

export async function generateHabitsFromGoal(goalText: string): Promise<HabitDraft[]> {
  const client = getAnthropicClient();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: goalText }],
    output_config: { format: zodOutputFormat(SuggestedHabitsSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("AI_PARSE_FAILED");
  }

  return response.parsed_output.habits.map((h) => ({
    name: h.name,
    emoji: h.emoji,
    type: h.type,
    unit: h.unit,
    targetValue: h.targetValue ?? undefined,
    unitLabel: h.unitLabel ?? undefined,
    rationale: h.rationale,
  }));
}
