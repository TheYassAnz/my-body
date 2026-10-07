import type { Profile } from "./queries";

/**
 * Steps implemented so far. L3 appends "goal";
 * onboarding is complete when nextOnboardingStep returns null.
 */
export const ONBOARDING_STEPS = ["sex", "body", "weight"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingProgress = { profile: Profile | null; hasWeight: boolean };

export function nextOnboardingStep({
  profile,
  hasWeight,
}: OnboardingProgress): OnboardingStep | null {
  if (!profile) return "sex";
  if (profile.heightCm === null || profile.birthDate === null) return "body";
  if (!hasWeight) return "weight";
  return null;
}
