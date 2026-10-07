import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { calibration, computeTrend, dailyTrendSeries, weeklyRate } from ".";

const TODAY = "2026-10-03";
const fiveYears = Array.from({ length: 5 * 365 + 1 }, (_, i) => ({
  date: addDays(TODAY, -i),
  weightKg: 80 + Math.sin(i / 9),
}));

function indicators() {
  const trend = computeTrend(fiveYears);
  calibration(fiveYears);
  weeklyRate(fiveYears, TODAY, trend[trend.length - 1].trendKg);
  dailyTrendSeries(trend, addDays(TODAY, -89), TODAY);
}

describe("ENF-04", () => {
  it("computes every weight indicator for 5 years of history in under 20 ms", () => {
    indicators(); // warm-up
    const start = performance.now();
    indicators();
    expect(performance.now() - start).toBeLessThan(20);
  });
});
