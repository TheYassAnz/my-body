import { BodyStep } from "@/features/profile/components/body-step";
import { OnboardingProgress } from "@/features/profile/components/onboarding-progress";
import { SexStep } from "@/features/profile/components/sex-step";
import {
  ONBOARDING_STEPS,
  nextOnboardingStep,
  type OnboardingStep,
} from "@/features/profile/onboarding";
import { requireUser } from "@/lib/session";

const titles: Record<OnboardingStep, string> = {
  sex: "Quelle silhouette afficher ?",
  body: "Parle-nous un peu de toi",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ etape?: string }>;
}) {
  const { profile } = await requireUser("onboarding");
  const { etape } = await searchParams;
  const next = nextOnboardingStep(profile) ?? "body";
  // Going back is allowed, skipping ahead is not.
  const requested = ONBOARDING_STEPS.find((s) => s === etape);
  const step =
    requested && ONBOARDING_STEPS.indexOf(requested) <= ONBOARDING_STEPS.indexOf(next)
      ? requested
      : next;
  const index = ONBOARDING_STEPS.indexOf(step) + 1;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-8 px-6 py-10">
      <OnboardingProgress step={index} total={ONBOARDING_STEPS.length} />
      <h1 className="text-2xl font-semibold tracking-tight">{titles[step]}</h1>
      {step === "sex" ? (
        <SexStep current={profile?.sex ?? null} />
      ) : (
        <BodyStep
          defaults={{ heightCm: profile?.heightCm ?? null, birthDate: profile?.birthDate ?? null }}
        />
      )}
    </main>
  );
}
