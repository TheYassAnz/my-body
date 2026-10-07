import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { calibration, rateWindow, slopePerDay, weeklyRate } from "./rate";
import { computeTrend } from "./trend";

const TODAY = "2026-10-03";
/** Weighings on the given day offsets before TODAY (0 = today), oldest first if offsets decrease. */
const at = (offsets: number[], weight: (offset: number) => number = () => 80) =>
  offsets.map((o) => ({ date: addDays(TODAY, -o), weightKg: weight(o) }));
/** Offsets n−1 … 0: one weighing per day for n days ending today. */
const days = (n: number) => Array.from({ length: n }, (_, i) => n - 1 - i);
/** −0.1 kg per day. */
const linear = (o: number) => 80 - 0.1 * (40 - o);

describe("calibration", () => {
  it("needs 7 weighings: 6 over 20 days miss one", () => {
    expect(calibration(at([20, 16, 12, 8, 4, 0]))).toEqual({
      calibrating: true,
      missingEntries: 1,
    });
  });

  it("counts every missing weighing", () => {
    expect(calibration([])).toEqual({ calibrating: true, missingEntries: 7 });
    expect(calibration(at([2, 1, 0]))).toEqual({ calibrating: true, missingEntries: 4 });
  });

  it("needs 10 days between the first and last weighing: 7 over 8 days miss one", () => {
    expect(calibration(at([8, 7, 6, 5, 4, 3, 0]))).toEqual({
      calibrating: true,
      missingEntries: 1,
    });
  });

  it("ends once 10 days separate the first and last weighing", () => {
    expect(calibration(at([9, 8, 7, 6, 5, 4, 0])).calibrating).toBe(true);
    expect(calibration(at([10, 8, 7, 6, 5, 4, 0]))).toEqual({
      calibrating: false,
      missingEntries: 0,
    });
  });
});

describe("weekly rate", () => {
  it("measures a perfectly linear loss exactly", () => {
    const r = weeklyRate(at(days(40), linear), TODAY, 76);
    expect(r?.kgPerWeek).toBeCloseTo(-0.7, 10);
    expect(r?.pctPerWeek).toBeCloseTo((-0.7 / 76) * 100, 10);
  });

  it("has no lag after a change of pace, unlike a regression on the trend", () => {
    // 60 flat days, then 28 days at −0.1 kg/day ending today.
    const points = at(days(88), (o) => (o >= 28 ? 80 : 80 - 0.1 * (28 - o)));
    expect(weeklyRate(points, TODAY, 77.5)?.kgPerWeek).toBeCloseTo(-0.7, 10);

    const trendPoints = computeTrend(points).map((t) => ({ date: t.date, weightKg: t.trendKg }));
    expect((slopePerDay(rateWindow(trendPoints, TODAY)) ?? 0) * 7).toBeGreaterThan(-0.6);
  });

  it("uses the whole history when it is shorter than 28 days", () => {
    const points = at(days(10), linear);
    expect(rateWindow(points, TODAY)).toHaveLength(10);
    expect(weeklyRate(points, TODAY, 80)?.kgPerWeek).toBeCloseTo(-0.7, 10);
  });

  it("keeps only the last 28 days when they hold enough weighings", () => {
    expect(rateWindow(at([40, ...days(6)]), TODAY)).toHaveLength(6);
    expect(rateWindow(at(days(40)), TODAY)).toHaveLength(28);
  });

  it("extends the window to the last 5 weighings when the 28 days hold fewer", () => {
    const points = at([60, 50, 40, 30, 3], linear);
    expect(rateWindow(points, TODAY).map((p) => p.date)).toEqual(points.map((p) => p.date));
    expect(weeklyRate(points, TODAY, 80)?.kgPerWeek).toBeCloseTo(-0.7, 10);
  });

  it("accepts another window length (plateau detection, L3)", () => {
    expect(rateWindow(at(days(40)), TODAY, 21)).toHaveLength(21);
  });

  it("ignores weighings dated after today", () => {
    const points = [...at(days(10), linear), { date: addDays(TODAY, 1), weightKg: 200 }];
    expect(weeklyRate(points, TODAY, 80)?.kgPerWeek).toBeCloseTo(-0.7, 10);
  });

  it("returns null without two distinct days", () => {
    expect(slopePerDay([])).toBeNull();
    expect(slopePerDay(at([0]))).toBeNull();
    expect(slopePerDay([...at([0]), ...at([0], () => 81)])).toBeNull();
    expect(weeklyRate(at([0]), TODAY, 80)).toBeNull();
  });
});
