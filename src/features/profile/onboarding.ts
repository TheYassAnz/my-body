import type { Profile } from "./queries";

/**
 * Steps implemented so far. L4 appends "measure" (step 5, optional);
 * onboarding is complete when nextOnboardingStep returns null.
 */
export const ONBOARDING_STEPS = ["sex", "body", "weight", "goal"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingProgress = { profile: Profile | null; hasWeight: boolean; hasGoal: boolean };

export function nextOnboardingStep({
  profile,
  hasWeight,
  hasGoal,
}: OnboardingProgress): OnboardingStep | null {
  if (!profile) return "sex";
  if (profile.heightCm === null || profile.birthDate === null) return "body";
  if (!hasWeight) return "weight";
  if (!hasGoal) return "goal";
  return null;
}
