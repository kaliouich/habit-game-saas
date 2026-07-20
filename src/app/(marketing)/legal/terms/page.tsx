import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Terms of Service — ${APP_NAME}` };

export default function TermsPage() {
  return (
    <div className="legalpage">
      <h1 className="legalpage__title">Terms of Service</h1>
      <p className="legalpage__updated">Last updated: [DATE] · Placeholder — have this reviewed by a lawyer before launch.</p>

      <h2>1. The service</h2>
      <p>
        {APP_NAME} (&quot;the Service&quot;, &quot;we&quot;, &quot;us&quot;) is a habit-tracking web application operated by
        [YOUR COMPANY NAME / LEGAL ENTITY], [ADDRESS]. By creating an account or using the Service, you agree to these
        Terms.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide a valid email address to sign in (via magic link or Google). You are responsible for
        activity on your account. We may suspend accounts that violate these Terms or applicable law.
      </p>

      <h2>3. Plans, billing &amp; cancellation</h2>
      <ul>
        <li>The Free plan is limited to 3 habits and the current calendar month, at no cost.</li>
        <li>The Pro plan is a paid subscription (monthly or yearly), billed in advance via Stripe.</li>
        <li>New Pro subscriptions include a 14-day free trial; you can cancel before it ends at no charge.</li>
        <li>
          You can cancel anytime from the Billing page (Stripe Customer Portal). Cancellation takes effect at the
          end of the current billing period — no partial refunds for unused time, unless required by law.
        </li>
        <li>We may change prices with at least 30 days&apos; notice to active subscribers.</li>
      </ul>

      <h2>4. Your data</h2>
      <p>
        You own the habits, logs, and mood entries you create. We store them to provide the Service and will not
        sell them. See our <a href="/legal/privacy">Privacy Policy</a> for details on what we collect and why.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        Don&apos;t use the Service to store unlawful content, attempt to disrupt the platform, or access accounts
        that aren&apos;t yours.
      </p>

      <h2>6. Availability &amp; liability</h2>
      <p>
        The Service is provided &quot;as is&quot;. We aim for high uptime but don&apos;t guarantee uninterrupted
        access. To the extent permitted by law, we are not liable for indirect or consequential damages arising
        from use of the Service.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may delete your account at any time from Settings, which permanently removes your habits, logs, and
        mood data. We may terminate accounts that breach these Terms.
      </p>

      <h2>8. Changes</h2>
      <p>We may update these Terms; material changes will be notified by email or in-app.</p>

      <h2>9. Contact</h2>
      <p>Questions about these Terms: [CONTACT EMAIL].</p>
    </div>
  );
}
