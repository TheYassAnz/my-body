import type { Profile } from "./queries";

/**
 * Steps implemented so far. L2 appends "weight" and L3 "goal";
 * onboarding is complete when nextOnboardingStep returns null.
 */
export const ONBOARDING_STEPS = ["sex", "body"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function nextOnboardingStep(profile: Profile | null): OnboardingStep | null {
  if (!profile) return "sex";
  if (profile.heightCm === null || profile.birthDate === null) return "body";
  return null;
}
