import { describe, expect, it } from "vitest";
import { goalProgress, projectGoal } from "./projection";
import type { GoalStatusCode } from "./goal-status";

const TODAY = "2026-10-07";
const base = {
  type: "lose" as const,
  targetKg: 80,
  status: "on_track" as GoalStatusCode,
  trendKg: 88,
  kgPerWeek: -0.35,
  today: TODAY,
};

describe("projectGoal (specs/03 §5.4)", () => {
  it("estimates the date, rounded up to the next day", () => {
    expect(projectGoal(base)).toEqual({
      kind: "estimated",
      date: "2027-03-16",
      daysRemaining: 160,
    });
  });
  it("also projects for too_slow and too_fast", () => {
    expect(projectGoal({ ...base, status: "too_slow" }).kind).toBe("estimated");
    expect(projectGoal({ ...base, status: "too_fast" }).kind).toBe("estimated");
  });
  it("projects a gain", () => {
    expect(
      projectGoal({ ...base, type: "gain", targetKg: 92, trendKg: 88, kgPerWeek: 0.35 }),
    ).toMatchObject({ kind: "estimated", daysRemaining: 80 });
  });
  it("is too_far beyond 730 days", () => {
    expect(projectGoal({ ...base, trendKg: 160 })).toEqual({ kind: "too_far" });
  });
  it("is still estimated at exactly 730 days", () => {
    expect(projectGoal({ ...base, trendKg: 153, targetKg: 80, kgPerWeek: -0.7 })).toMatchObject({
      kind: "estimated",
      daysRemaining: 730,
    });
  });
  it.each([
    "calibrating",
    "achieved",
    "plateau",
    "wrong_direction",
    "stable",
    "out_of_band",
  ] as const)("is unavailable when the status is %s", (status) => {
    expect(projectGoal({ ...base, status })).toEqual({ kind: "unavailable" });
  });
  it("is unavailable for maintain and recomp", () => {
    expect(projectGoal({ ...base, type: "maintain", targetKg: null })).toEqual({
      kind: "unavailable",
    });
    expect(projectGoal({ ...base, type: "recomp", targetKg: null })).toEqual({
      kind: "unavailable",
    });
  });
  it("is unavailable without a pace, with a null pace or against the goal's direction", () => {
    expect(projectGoal({ ...base, kgPerWeek: null })).toEqual({ kind: "unavailable" });
    expect(projectGoal({ ...base, kgPerWeek: 0 })).toEqual({ kind: "unavailable" });
    expect(projectGoal({ ...base, kgPerWeek: 0.3 })).toEqual({ kind: "unavailable" });
  });
});

describe("goalProgress", () => {
  it("is (start − trend) / (start − target) for a loss", () => {
    expect(goalProgress(90, 88, 80)).toBeCloseTo(0.2, 10);
  });
  it("is the same ratio for a gain", () => {
    expect(goalProgress(70, 72, 80)).toBeCloseTo(0.2, 10);
  });
  it("is clamped between 0 and 1", () => {
    expect(goalProgress(90, 92, 80)).toBe(0);
    expect(goalProgress(90, 70, 80)).toBe(1);
  });
  it("is 0 when start and target coincide", () => {
    expect(goalProgress(80, 80, 80)).toBe(0);
  });
});
