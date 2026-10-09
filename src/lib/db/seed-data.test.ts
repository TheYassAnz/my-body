import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { ZONES, currentTrend, isRateInBounds, slopePerDay } from "@/lib/metrics";
import { round2 } from "@/lib/units";
import { demoGoal, demoMeasurements, demoWeights } from "./seed-data";

const TODAY = "2026-10-03";

describe("demoWeights", () => {
  const weights = demoWeights(TODAY);

  it("is identical on every run", () => {
    expect(demoWeights(TODAY)).toEqual(weights);
  });

  it("covers about 120 days and ends yesterday, so today stays free for E2E-2", () => {
    expect(weights.length).toBeGreaterThan(90);
    expect(weights.length).toBeLessThanOrEqual(120);
    expect(weights[0].date >= addDays(TODAY, -120)).toBe(true);
    expect(weights[weights.length - 1].date).toBe(addDays(TODAY, -1));
    expect(weights.every((w) => w.date < TODAY)).toBe(true);
  });

  it("loses about 0.35 kg per week with realistic noise", () => {
    expect((slopePerDay(weights) ?? 0) * 7).toBeCloseTo(-0.35, 1);
    expect(weights.every((w) => w.weightKg > 78 && w.weightKg < 88)).toBe(true);
  });
});

describe("demoGoal", () => {
  const today = "2026-10-03";
  const weights = demoWeights(today);

  it("is a loss goal started 30 days ago, from the trend of that day", () => {
    const goal = demoGoal(today, weights);
    expect(goal).toMatchObject({
      type: "lose",
      startDate: "2026-09-03",
      targetWeightKg: 75,
      weeklyRatePct: 0.5,
    });
    const upToStart = weights.filter((w) => w.date <= "2026-09-03");
    expect(goal.startWeightKg).toBe(round2(currentTrend(upToStart) as number));
  });

  it("has a target below the current weight and a rate within the bounds", () => {
    const goal = demoGoal(today, weights);
    expect(goal.targetWeightKg as number).toBeLessThan(weights[weights.length - 1].weightKg);
    expect(isRateInBounds("lose", goal.weeklyRatePct as number)).toBe(true);
  });
});

describe("demoMeasurements", () => {
  const sessions = demoMeasurements("2026-10-03");

  it("builds ten sessions of eight zones, none dated today", () => {
    expect(sessions).toHaveLength(10);
    for (const s of sessions) {
      expect(s.date < "2026-10-03").toBe(true);
      expect(Object.keys(s.values).sort()).toEqual([...ZONES].sort());
    }
  });

  it("stays within the stored bounds and is identical on every run", () => {
    for (const s of sessions)
      for (const v of Object.values(s.values)) expect(v).toBeGreaterThanOrEqual(10);
    for (const s of sessions)
      for (const v of Object.values(s.values)) expect(v).toBeLessThanOrEqual(250);
    expect(demoMeasurements("2026-10-03")).toEqual(sessions);
  });

  it("is chronological, with the waist going down (the demo goal is a loss)", () => {
    const dates = sessions.map((s) => s.date);
    expect([...dates].sort()).toEqual(dates);
    expect(sessions.at(-1)?.values.waist).toBeLessThan(sessions[0].values.waist);
  });

  it("keeps the last session within 14 days, so the demo is not 'stale'", () => {
    expect(sessions.at(-1)?.date).toBe("2026-10-01");
  });
});
