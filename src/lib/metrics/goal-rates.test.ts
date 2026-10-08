import { describe, expect, it } from "vitest";
import {
  GOAL_RATES,
  daysToReach,
  exceedsRecommended,
  isRateInBounds,
  previewKgPerWeek,
  snapRate,
  theoreticalDate,
} from "./goal-rates";

describe("GOAL_RATES (specs/03 §4)", () => {
  it("holds the bounds, recommended zones and defaults", () => {
    expect(GOAL_RATES.lose).toEqual({
      min: 0.25,
      max: 1.5,
      recommendedMin: 0.5,
      recommendedMax: 1,
      default: 0.5,
    });
    expect(GOAL_RATES.gain).toEqual({
      min: 0.1,
      max: 0.75,
      recommendedMin: 0.1,
      recommendedMax: 0.5,
      default: 0.25,
    });
  });
});

describe("snapRate", () => {
  it("rounds to the 0.05 step", () => {
    expect(snapRate(0.37)).toBe(0.35);
    expect(snapRate(0.38)).toBe(0.4);
    expect(snapRate(0.5)).toBe(0.5);
  });
  it("keeps NaN as NaN", () => {
    expect(snapRate(Number.NaN)).toBeNaN();
  });
});

describe("isRateInBounds", () => {
  it.each([
    ["lose", 0.25, true],
    ["lose", 0.2, false],
    ["lose", 1.5, true],
    ["lose", 1.55, false],
    ["gain", 0.1, true],
    ["gain", 0.05, false],
    ["gain", 0.75, true],
    ["gain", 0.8, false],
  ] as const)("%s at %s %%/week → %s", (type, pct, expected) => {
    expect(isRateInBounds(type, pct)).toBe(expected);
  });
  it("rejects NaN", () => {
    expect(isRateInBounds("lose", Number.NaN)).toBe(false);
  });
});

describe("exceedsRecommended", () => {
  it("flags a loss above 1.0 and a gain above 0.5", () => {
    expect(exceedsRecommended("lose", 1)).toBe(false);
    expect(exceedsRecommended("lose", 1.05)).toBe(true);
    expect(exceedsRecommended("gain", 0.5)).toBe(false);
    expect(exceedsRecommended("gain", 0.55)).toBe(true);
  });
});

describe("previewKgPerWeek", () => {
  it("is rate / 100 × trend", () => {
    expect(previewKgPerWeek(0.5, 78)).toBeCloseTo(0.39, 10);
  });
});

describe("daysToReach", () => {
  it("rounds up to the next day", () => {
    expect(daysToReach(1, 0.3)).toBe(4);
  });
  it("is not pushed one day up by floating-point noise", () => {
    expect(daysToReach(73, 0.1)).toBe(730);
  });
});

describe("theoreticalDate", () => {
  const today = "2026-10-07";
  it("is today + |target − from| / (kg/week) × 7 days", () => {
    expect(theoreticalDate(today, 80, 76, 0.4)).toBe("2026-12-16");
  });
  it("works for a gain", () => {
    expect(theoreticalDate(today, 70, 72, 0.35)).toBe("2026-11-16");
  });
  it("is null when the pace is not positive", () => {
    expect(theoreticalDate(today, 80, 76, 0)).toBeNull();
    expect(theoreticalDate(today, 80, 76, -0.4)).toBeNull();
    expect(theoreticalDate(today, 80, 76, Number.NaN)).toBeNull();
  });
  it("is null beyond 730 days, but not at 730 exactly", () => {
    expect(theoreticalDate(today, 100, 50, 0.4)).toBeNull();
    expect(theoreticalDate(today, 100, 27, 0.7)).toBe("2028-10-06");
  });
});
