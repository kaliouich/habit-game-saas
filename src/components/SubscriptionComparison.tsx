import { PLAN_LIMITS, SHIELDS_PER_MONTH } from "@/lib/config";

/**
 * Matrice de comparaison Free vs Pro (page /app/billing).
 *
 * Les valeurs sont DÉRIVÉES de config.ts, jamais recopiées : une version
 * précédente affichait « 3 habitudes / 24 » alors que les quotas réels sont
 * 5 / illimité — de l'information tarifaire fausse montrée au client, et une
 * divergence invisible tant que personne ne compare les deux fichiers.
 */

interface Feature {
  name: string;
  free: string | boolean;
  pro: string | boolean;
}

function habitsLabel(max: number): string {
  return Number.isFinite(max) ? String(max) : "Unlimited";
}

const FEATURES: Feature[] = [
  {
    name: "Habits",
    free: habitsLabel(PLAN_LIMITS.FREE.maxHabits),
    pro: habitsLabel(PLAN_LIMITS.PRO.maxHabits),
  },
  { name: "History", free: "Current month", pro: "Unlimited" },
  { name: "Mood tracking", free: true, pro: true },
  {
    name: "Streak shields",
    free: `${SHIELDS_PER_MONTH.FREE}/month`,
    pro: `${SHIELDS_PER_MONTH.PRO}/month`,
  },
  { name: "Vacation mode", free: false, pro: true },
  { name: "Per-day notes", free: false, pro: true },
  { name: "Export CSV", free: false, pro: true },
  { name: "Weekly email recap", free: false, pro: true },
  { name: "Ads", free: true, pro: false },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value !== "boolean") return <>{value}</>;
  return value ? (
    <span className="feature-check" aria-label="Yes">
      ✓
    </span>
  ) : (
    <span className="feature-x" aria-label="No">
      ✗
    </span>
  );
}

export function SubscriptionComparison() {
  return (
    <div className="subscription-comparison">
      <h2 className="subscription-comparison__title">Compare plans</h2>
      <table className="subscription-comparison__table">
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col" className="subscription-comparison__free">
              🆓 Free
            </th>
            <th scope="col" className="subscription-comparison__pro">
              ⭐ Pro
            </th>
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature) => (
            <tr key={feature.name} className="subscription-comparison__row">
              <th scope="row" className="subscription-comparison__feature">
                {feature.name}
              </th>
              <td className="subscription-comparison__free">
                <Cell value={feature.free} />
              </td>
              <td className="subscription-comparison__pro">
                <Cell value={feature.pro} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
