import { getCurrentUser } from "@/lib/user";
import { getDashboardData } from "@/lib/data";
import { currentMonth, isValidMonthKey } from "@/lib/dates";
import { canAddHabit, maxHabits } from "@/lib/quotas";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { OnboardingBanner } from "@/components/dashboard/OnboardingBanner";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams; // Next 16 : searchParams est une Promise
  const user = await getCurrentUser();
  const month = isValidMonthKey(rawMonth) ? rawMonth : currentMonth(user.timezone);
  const weekStartsOn = user.weekStartsOn === 0 ? 0 : 1;

  const { stats, habits, today, activeCount } = await getDashboardData(
    user.id,
    month,
    user.timezone,
    weekStartsOn,
  );

  return (
    <>
      {habits.length === 0 && <OnboardingBanner />}
      <Dashboard
        month={month}
        stats={stats}
        habits={habits}
        today={today}
        canAdd={canAddHabit(user.plan, activeCount)}
        limit={maxHabits(user.plan)}
        userEmail={user.email}
        plan={user.plan}
      />
    </>
  );
}
