import { BodyStep } from "@/features/profile/components/body-step";
import { MeasureStep } from "@/features/profile/components/measure-step";
import { OnboardingProgress } from "@/features/profile/components/onboarding-progress";
import { SexStep } from "@/features/profile/components/sex-step";
import { GoalStep } from "@/features/profile/components/goal-step";
import { WeightStep } from "@/features/profile/components/weight-step";
import {
  ONBOARDING_STEPS,
  nextOnboardingStep,
  type OnboardingStep,
} from "@/features/profile/onboarding";
import { getActiveGoal } from "@/features/goals/queries";
import { getLatestWeight, listWeights } from "@/features/weight/queries";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { goalReferenceKg } from "@/lib/metrics";
import { requireUser } from "@/lib/session";

const titles: Record<OnboardingStep, string> = {
  sex: "Quelle silhouette afficher ?",
  body: "Parle-nous un peu de toi",
  weight: "Quel est ton poids actuel ?",
  goal: "Quel est ton objectif ?",
  measure: "Mesure-toi maintenant pour voir ta progression plus tard",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ etape?: string }>;
}) {
  const { userId, profile } = await requireUser("onboarding");
  const { etape } = await searchParams;
  const db = getDb();
  const [latest, goal] = profile
    ? await Promise.all([getLatestWeight(db, userId), getActiveGoal(db, userId)])
    : [null, null];
  const next =
    nextOnboardingStep({ profile, hasWeight: latest !== null, hasGoal: goal !== null }) ?? "goal";
  // Going back is allowed, skipping ahead is not.
  const requested = ONBOARDING_STEPS.find((s) => s === etape);
  const wanted =
    requested && ONBOARDING_STEPS.indexOf(requested) <= ONBOARDING_STEPS.indexOf(next)
      ? requested
      : next;
  const todayDate = today(profile?.timezone ?? "Europe/Paris");
  const referenceKg =
    wanted === "goal" ? goalReferenceKg(await listWeights(db, userId), todayDate) : null;
  // No weighing to base a goal on: fall back to the weight step instead of an empty page.
  const step: OnboardingStep = wanted === "goal" && referenceKg === null ? "weight" : wanted;
  const index = ONBOARDING_STEPS.indexOf(step) + 1;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-8 px-6 py-10">
      <OnboardingProgress step={index} total={ONBOARDING_STEPS.length} />
      <h1 className="text-2xl font-semibold tracking-tight">{titles[step]}</h1>
      {step === "sex" && <SexStep current={profile?.sex ?? null} />}
      {step === "body" && (
        <BodyStep
          defaults={{ heightCm: profile?.heightCm ?? null, birthDate: profile?.birthDate ?? null }}
        />
      )}
      {step === "weight" && (
        <WeightStep
          today={todayDate}
          defaultUnit={profile?.weightUnit ?? "kg"}
          defaultKg={latest?.weightKg ?? null}
        />
      )}
      {step === "goal" && referenceKg !== null && (
        <GoalStep unit={profile?.weightUnit ?? "kg"} referenceKg={referenceKg} today={todayDate} />
      )}
      {step === "measure" && <MeasureStep />}
    </main>
  );
}
