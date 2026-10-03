import { describe, expect, it } from "vitest";
import { nextOnboardingStep } from "./onboarding";
import type { Profile } from "./queries";

const profile = (p: Partial<Profile>): Profile => ({
  userId: "u",
  sex: "female",
  heightCm: null,
  birthDate: null,
  weightUnit: "kg",
  lengthUnit: "cm",
  timezone: "Europe/Paris",
  reminderWeekday: null,
  onboardingCompletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...p,
});

describe("nextOnboardingStep", () => {
  it("starts with the silhouette when there is no profile", () => {
    expect(nextOnboardingStep(null)).toBe("sex");
  });

  it("asks for height and birth date next", () => {
    expect(nextOnboardingStep(profile({}))).toBe("body");
    expect(nextOnboardingStep(profile({ heightCm: 170 }))).toBe("body");
  });

  it("is done once every implemented step is filled", () => {
    expect(nextOnboardingStep(profile({ heightCm: 170, birthDate: "1990-01-01" }))).toBeNull();
  });
});
