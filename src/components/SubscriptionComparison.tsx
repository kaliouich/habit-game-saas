/**
 * Matrice de comparaison Free vs Pro
 * Affichée sur la page /app/billing
 */

interface Feature {
  name: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURES: Feature[] = [
  { name: "Habits per month", free: "3", pro: "24" },
  { name: "History", free: "Current month", pro: "Unlimited" },
  { name: "Mood tracking", free: true, pro: true },
  { name: "Streak shields", free: false, pro: "3/month" },
  { name: "Vacation mode", free: false, pro: true },
  { name: "Export CSV", free: false, pro: true },
  { name: "Ads", free: true, pro: false },
];

export function SubscriptionComparison() {
  return (
    <div className="subscription-comparison">
      <h2 className="subscription-comparison__title">Compare plans</h2>
      <table className="subscription-comparison__table">
        <thead>
          <tr>
            <th>Feature</th>
            <th className="subscription-comparison__free">🆓 Free</th>
            <th className="subscription-comparison__pro">⭐ Pro</th>
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature) => (
            <tr key={feature.name} className="subscription-comparison__row">
              <td className="subscription-comparison__feature">{feature.name}</td>
              <td className="subscription-comparison__free">
                {typeof feature.free === "boolean" ? (
                  feature.free ? (
                    <span className="feature-check">✓</span>
                  ) : (
                    <span className="feature-x">✗</span>
                  )
                ) : (
                  feature.free
                )}
              </td>
              <td className="subscription-comparison__pro">
                {typeof feature.pro === "boolean" ? (
                  feature.pro ? (
                    <span className="feature-check">✓</span>
                  ) : (
                    <span className="feature-x">✗</span>
                  )
                ) : (
                  feature.pro
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
