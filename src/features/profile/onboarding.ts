import type { Profile } from "./queries";

/** Onboarding steps in order; step 5 is optional but is what completes the onboarding. */
export const ONBOARDING_STEPS = ["sex", "body", "weight", "goal", "measure"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingProgress = { profile: Profile | null; hasWeight: boolean; hasGoal: boolean };

/** The first incomplete step; null once the onboarding is completed. */
export function nextOnboardingStep({
  profile,
  hasWeight,
  hasGoal,
}: OnboardingProgress): OnboardingStep | null {
  if (!profile) return "sex";
  if (profile.heightCm === null || profile.birthDate === null) return "body";
  if (!hasWeight) return "weight";
  if (!hasGoal) return "goal";
  return profile.onboardingCompletedAt ? null : "measure";
}
