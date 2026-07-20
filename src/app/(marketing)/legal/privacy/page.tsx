import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Privacy Policy — ${APP_NAME}` };

export default function PrivacyPage() {
  return (
    <div className="legalpage">
      <h1 className="legalpage__title">Privacy Policy</h1>
      <p className="legalpage__updated">Last updated: [DATE] · Placeholder — have this reviewed by a lawyer before launch.</p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong>: email address, name and profile picture if you sign in with Google.
        </li>
        <li>
          <strong>Product data</strong>: the habits you create, the days you check off, and the mood entries you
          log.
        </li>
        <li>
          <strong>Billing data</strong>: if you subscribe to Pro, Stripe processes your payment details — we never
          see or store your card number.
        </li>
        <li>
          <strong>Usage analytics</strong>: anonymous, cookie-free page-view analytics (Umami), if enabled.
        </li>
      </ul>

      <h2>2. Why we collect it</h2>
      <p>
        Solely to provide and improve the Service: authenticate you, display your dashboard, calculate your stats,
        process subscriptions, and send transactional emails (magic links, receipts, optional weekly recap).
      </p>

      <h2>3. Who processes it</h2>
      <ul>
        <li>
          <strong>Hosting &amp; database</strong>: our own infrastructure (PostgreSQL), not shared with third
          parties.
        </li>
        <li>
          <strong>Google</strong>: only if you choose &quot;Sign in with Google&quot; (OAuth) — see Google&apos;s
          own privacy policy.
        </li>
        <li>
          <strong>Resend</strong>: sends our transactional emails (magic links, recaps).
        </li>
        <li>
          <strong>Stripe</strong>: processes payments and manages subscriptions for the Pro plan.
        </li>
      </ul>
      <p>We do not sell your personal data to anyone.</p>

      <h2>4. Data retention</h2>
      <p>
        We keep your data while your account is active. If you delete your account, your habits, logs, and mood
        entries are permanently deleted. Billing records may be retained longer where required by tax law.
      </p>

      <h2>5. Your rights</h2>
      <p>
        Depending on your location (e.g. GDPR in the EU), you may have the right to access, export, correct, or
        delete your personal data. You can export your data (CSV, Pro plan) or delete your account directly from
        Settings, or contact us at [CONTACT EMAIL].
      </p>

      <h2>6. Cookies</h2>
      <p>
        We use a strictly necessary session cookie to keep you signed in. If analytics are enabled, we use
        Umami, a cookie-free, privacy-friendly analytics tool that does not track you across sites.
      </p>

      <h2>7. Changes</h2>
      <p>We may update this policy; material changes will be notified by email or in-app.</p>

      <h2>8. Contact</h2>
      <p>Questions about this policy: [CONTACT EMAIL].</p>
    </div>
  );
}
