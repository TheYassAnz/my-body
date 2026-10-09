import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { isFavourable, selectSeries } from "./select-series";

const TODAY = "2026-10-09";
const weights = [200, 100, 0].map((d) => ({
  date: addDays(TODAY, -d),
  weightKg: 80,
  bodyFatPct: null,
  note: null,
}));
const data = (measures: { date: string; zone: string; valueCm: number }[] = []) =>
  ({ weights, measures, goal: null }) as unknown as Parameters<typeof selectSeries>[0]["data"];
const select = (metric: "weight" | "bodyFat" | "waist", d = data()) =>
  selectSeries({
    data: d,
    metric,
    period: null,
    today: TODAY,
    weightUnit: "kg",
    lengthUnit: "cm",
  });

describe("selectSeries", () => {
  it("falls back to weight for bodyFat without body-fat data", () => {
    const v = select("bodyFat");
    expect(v.metric).toBe("weight");
    expect(v.hasBodyFat).toBe(false);
  });

  it("derives the default period per metric (long weight history, short waist history)", () => {
    const d = data([{ date: addDays(TODAY, -10), zone: "waist", valueCm: 85 }]);
    expect(select("weight", d).period).toBe("3m");
    expect(select("waist", d).period).toBe("tout");
  });
});

describe("isFavourable", () => {
  it.each([
    ["weight", -1, "lose", true],
    ["weight", 1, "lose", false],
    ["weight", 1, "gain", true],
    ["weight", -1, "gain", false],
    ["weight", -1, "maintain", false],
    ["bodyFat", -1, "recomp", true],
    ["bodyFat", 1, "lose", false],
    ["waist", -1, "lose", true],
    ["waist", 1, "lose", false],
    ["arm", 1, "gain", true],
    ["weight", 0, "lose", false],
    ["weight", null, "lose", false],
    ["weight", -1, null, false],
  ] as const)("%s %s with goal %s -> %s", (metric, v, goal, expected) => {
    expect(isFavourable(metric, v, goal)).toBe(expected);
  });
});
