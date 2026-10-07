import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { computeTrend } from "@/lib/metrics";
import { buildWeightSummary } from "./weight-summary";

const TODAY = "2026-10-03";
const at = (offset: number, weightKg: number) => ({ date: addDays(TODAY, -offset), weightKg });

describe("buildWeightSummary", () => {
  it("is empty without any weighing (accounts onboarded before L2)", () => {
    expect(buildWeightSummary([], TODAY)).toEqual({ state: "empty" });
  });

  it("shows the last weighing while calibrating", () => {
    const s = buildWeightSummary([at(0, 70.4)], TODAY);
    expect(s).toMatchObject({
      state: "calibrating",
      latest: { date: TODAY, weightKg: 70.4 },
      todayKg: 70.4,
      missingEntries: 6,
    });
  });

  it("shows the trend and the weekly rate once calibrated", () => {
    const entries = [12, 10, 8, 6, 4, 3, 2, 1].map((o) => at(o, 80 - 0.1 * (12 - o)));
    const s = buildWeightSummary(entries, TODAY);
    const trend = computeTrend(entries);
    expect(s).toMatchObject({
      state: "ready",
      trendKg: trend[trend.length - 1].trendKg,
      todayKg: null,
    });
    expect(s.state === "ready" && s.rate?.kgPerWeek).toBeCloseTo(-0.7, 10);
  });

  it("limits the sparkline to 90 days, carrying the older trend in", () => {
    const s = buildWeightSummary([at(100, 82), at(0, 80)], TODAY);
    if (s.state === "empty") throw new Error("unexpected");
    expect(s.sparkline.from).toBe(addDays(TODAY, -89));
    expect(s.sparkline.dots).toEqual([{ date: TODAY, weightKg: 80 }]);
    expect(s.sparkline.trend[0]).toEqual({ date: addDays(TODAY, -89), trendKg: 82 });
    expect(s.sparkline.trend).toHaveLength(90);
  });

  it("ignores weighings dated after today (timezone change)", () => {
    expect(buildWeightSummary([at(-1, 90)], TODAY)).toEqual({ state: "empty" });
  });
});
