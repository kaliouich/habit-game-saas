import { getTranslations } from "next-intl/server";
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
  nameKey: string;
  free: string | boolean;
  pro: string | boolean;
}

function Cell({ value, yesLabel, noLabel }: { value: string | boolean; yesLabel: string; noLabel: string }) {
  if (typeof value !== "boolean") return <>{value}</>;
  return value ? (
    <span className="feature-check" aria-label={yesLabel}>
      ✓
    </span>
  ) : (
    <span className="feature-x" aria-label={noLabel}>
      ✗
    </span>
  );
}

export async function SubscriptionComparison() {
  const t = await getTranslations("Billing.compare");
  const habitsLabel = (max: number) => (Number.isFinite(max) ? String(max) : t("unlimited"));

  const features: Feature[] = [
    { nameKey: "habits", free: habitsLabel(PLAN_LIMITS.FREE.maxHabits), pro: habitsLabel(PLAN_LIMITS.PRO.maxHabits) },
    { nameKey: "history", free: t("currentMonth"), pro: t("unlimited") },
    { nameKey: "moodTracking", free: true, pro: true },
    { nameKey: "streakShields", free: t("perMonth", { count: SHIELDS_PER_MONTH.FREE }), pro: t("perMonth", { count: SHIELDS_PER_MONTH.PRO }) },
    { nameKey: "vacationMode", free: false, pro: true },
    { nameKey: "perDayNotes", free: false, pro: true },
    { nameKey: "exportCsv", free: false, pro: true },
    { nameKey: "weeklyEmailRecap", free: false, pro: true },
    { nameKey: "ads", free: true, pro: false },
  ];

  return (
    <div className="subscription-comparison">
      <h2 className="subscription-comparison__title">{t("title")}</h2>
      <table className="subscription-comparison__table">
        <thead>
          <tr>
            <th scope="col">{t("feature")}</th>
            <th scope="col" className="subscription-comparison__free">
              🆓 {t("free")}
            </th>
            <th scope="col" className="subscription-comparison__pro">
              ⭐ {t("pro")}
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.nameKey} className="subscription-comparison__row">
              <th scope="row" className="subscription-comparison__feature">
                {t(`features.${feature.nameKey}`)}
              </th>
              <td className="subscription-comparison__free">
                <Cell value={feature.free} yesLabel={t("yes")} noLabel={t("no")} />
              </td>
              <td className="subscription-comparison__pro">
                <Cell value={feature.pro} yesLabel={t("yes")} noLabel={t("no")} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
