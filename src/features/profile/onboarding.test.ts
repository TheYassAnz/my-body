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
  const done = profile({ heightCm: 170, birthDate: "1990-01-01" });

  it("starts with the silhouette when there is no profile", () => {
    expect(nextOnboardingStep({ profile: null, hasWeight: false, hasGoal: false })).toBe("sex");
  });

  it("asks for height and birth date next", () => {
    expect(nextOnboardingStep({ profile: profile({}), hasWeight: false, hasGoal: false })).toBe(
      "body",
    );
    expect(
      nextOnboardingStep({ profile: profile({ heightCm: 170 }), hasWeight: true, hasGoal: true }),
    ).toBe("body");
  });

  it("asks for the current weight once the body step is filled", () => {
    expect(nextOnboardingStep({ profile: done, hasWeight: false, hasGoal: false })).toBe("weight");
  });

  it("asks for the goal once the first weighing exists", () => {
    expect(nextOnboardingStep({ profile: done, hasWeight: true, hasGoal: false })).toBe("goal");
  });

  it("is complete once profile, weighing and goal exist", () => {
    expect(nextOnboardingStep({ profile: done, hasWeight: true, hasGoal: true })).toBeNull();
  });

  it("does not skip ahead to the goal without a weighing", () => {
    expect(nextOnboardingStep({ profile: done, hasWeight: false, hasGoal: true })).toBe("weight");
  });
});
