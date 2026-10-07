import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { slopePerDay } from "@/lib/metrics";
import { demoWeights } from "./seed-data";

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
