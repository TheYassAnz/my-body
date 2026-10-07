import { describe, expect, it } from "vitest";
import { computeTrend, currentTrend, dailyTrendSeries } from "./trend";

const p = (date: string, weightKg: number) => ({ date, weightKg });

describe("computeTrend", () => {
  it("equals the weighing when there is only one", () => {
    expect(computeTrend([p("2026-01-01", 80)])).toEqual([
      { date: "2026-01-01", weightKg: 80, trendKg: 80 },
    ]);
  });

  it("follows the worked example of specs/03 §1", () => {
    const t = computeTrend([
      p("2026-01-01", 80),
      p("2026-01-02", 79),
      p("2026-01-03", 79.6),
      p("2026-01-06", 79.2),
    ]).map((x) => x.trendKg);
    expect(t[0]).toBe(80);
    expect(t[1]).toBeCloseTo(79.5, 10);
    expect(t[2]).toBeCloseTo(79.5333, 4);
    expect(t[3]).toBeCloseTo(79.443, 3);
  });

  it("uses alpha = 0.1 between consecutive days after the seed", () => {
    const t = computeTrend([
      p("2026-01-01", 80),
      p("2026-01-02", 80),
      p("2026-01-03", 80),
      p("2026-01-04", 70),
    ]);
    expect(t[3].trendKg).toBeCloseTo(79, 10);
  });

  it("adjusts alpha to missing days: 1 − 0.9³ = 0.271 after a 3-day gap", () => {
    const t = computeTrend([
      p("2026-01-01", 80),
      p("2026-01-02", 80),
      p("2026-01-03", 80),
      p("2026-01-06", 70),
    ]);
    expect(t[3].trendKg).toBeCloseTo(80 - 2.71, 10);
  });

  it("sorts weighings by date and leaves the input untouched", () => {
    const input = [p("2026-01-03", 79.6), p("2026-01-01", 80), p("2026-01-02", 79)];
    expect(computeTrend(input).map((x) => x.date)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
    expect(input[0].date).toBe("2026-01-03");
  });
});

describe("currentTrend", () => {
  it("is the trend of the latest weighing, or null without any", () => {
    expect(currentTrend([])).toBeNull();
    expect(currentTrend([p("2026-01-02", 79), p("2026-01-01", 80)])).toBeCloseTo(79.5, 10);
  });
});

describe("dailyTrendSeries", () => {
  const trend = computeTrend([p("2026-01-02", 80), p("2026-01-04", 78)]);

  it("repeats the last known trend on days without weighing", () => {
    expect(dailyTrendSeries(trend, "2026-01-02", "2026-01-05")).toEqual([
      { date: "2026-01-02", trendKg: 80 },
      { date: "2026-01-03", trendKg: 80 },
      { date: "2026-01-04", trendKg: 79 },
      { date: "2026-01-05", trendKg: 79 },
    ]);
  });

  it("starts at the first weighing and carries a trend from before the range", () => {
    expect(dailyTrendSeries(trend, "2026-01-01", "2026-01-02")).toEqual([
      { date: "2026-01-02", trendKg: 80 },
    ]);
    expect(dailyTrendSeries(trend, "2026-01-05", "2026-01-05")).toEqual([
      { date: "2026-01-05", trendKg: 79 },
    ]);
  });
});
