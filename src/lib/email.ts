import { Resend } from "resend";

const globalForResend = globalThis as unknown as { resend?: Resend };

/**
 * Instanciation paresseuse, même raison que lib/stripe.ts : le SDK ne doit pas
 * planter le build/import tant que la clé n'est pas configurée.
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) return null;
  if (!globalForResend.resend) globalForResend.resend = new Resend(apiKey);
  return globalForResend.resend;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/** No-op (log) tant que AUTH_RESEND_KEY n'est pas configurée — jamais d'erreur bloquante. */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<{ ok: boolean }> {
  const client = getResendClient();
  const from = process.env.EMAIL_FROM;

  if (!client || !from) {
    console.warn(`[email] AUTH_RESEND_KEY absente — email "${subject}" à ${to} non envoyé (no-op).`);
    return { ok: false };
  }

  const { error } = await client.emails.send({ from, to, subject, html });
  if (error) {
    console.error(`[email] échec d'envoi à ${to}:`, error);
    return { ok: false };
  }
  return { ok: true };
}
