import { getCurrentUser } from "@/lib/user";
import { isAiOnboardingConfigured } from "@/lib/ai";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await getCurrentUser();

  return (
    <div className="onboardpage">
      <OnboardingWizard aiConfigured={isAiOnboardingConfigured()} />
    </div>
  );
}
