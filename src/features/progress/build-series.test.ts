import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { computeTrend } from "@/lib/metrics";
import { toDisplayWeight } from "@/lib/units";
import type { Goal } from "../goals/queries";
import type { WeightEntry } from "../weight/queries";
import { buildSimpleSeries, buildWeightSeries } from "./build-series";

const TODAY = "2026-10-07";
const w = (daysAgo: number, kg: number) =>
  ({ date: addDays(TODAY, -daysAgo), weightKg: kg, note: null }) as WeightEntry;
const linear = (days: number, start: number, perDay: number) =>
  Array.from({ length: days + 1 }, (_, i) => w(days - i, start + perDay * i));
const goal = (targetWeightKg: number | null): Goal =>
  ({
    type: "lose",
    startDate: addDays(TODAY, -30),
    startWeightKg: 90,
    targetWeightKg,
    weeklyRatePct: 0.5,
  }) as Goal;

describe("buildWeightSeries", () => {
  const weights = linear(120, 95, -0.1);
  const base = { weights, goal: null, unit: "kg" as const, today: TODAY };

  it("cuts the full-history trend to the window instead of recomputing it", () => {
    const s = buildWeightSeries({ ...base, period: "1m" });
    const full = computeTrend(weights.map(({ date, weightKg }) => ({ date, weightKg }))).find(
      (t) => t.date === addDays(TODAY, -30),
    )!;
    expect(s.trend![0]).toEqual({
      date: addDays(TODAY, -30),
      value: toDisplayWeight(full.trendKg, "kg"),
    });
    expect(s.trend).toHaveLength(31);
    expect(s.points).toHaveLength(31);
    expect(s.stats.count).toBe(31);
  });

  it("variation = trend end - trend start, rate from raw weighings", () => {
    const s = buildWeightSeries({ ...base, period: "3m" });
    const t = s.trend!;
    expect(s.stats.variation).toBeCloseTo(t.at(-1)!.value - t[0].value, 1);
    expect(s.stats.secondary).toEqual({ kind: "rate", value: -0.7 });
    expect(s.summary).toMatch(/^Tendance de \d+,\d à \d+,\d.kg sur 3 mois, −0,7 kg\/semaine$/);
  });

  it("target only with a target weight; projection only when estimated", () => {
    expect(buildWeightSeries({ ...base, period: "1m" }).target).toBeUndefined();
    const maintain = { ...goal(null), type: "maintain", weeklyRatePct: null } as Goal;
    const none = buildWeightSeries({ ...base, goal: maintain, period: "1m" });
    expect(none.target).toBeUndefined();
    expect(none.projection).toBeUndefined();
    const s = buildWeightSeries({ ...base, goal: goal(80), period: "1m" });
    expect(s.target).toBe(80);
    expect(s.projection?.from.date).toBe(TODAY);
    expect(s.projection?.to.value).toBe(80);
    expect(s.projection!.to.date > TODAY).toBe(true);
    const gaining = buildWeightSeries({
      ...base,
      weights: linear(60, 80, 0.1),
      goal: goal(70),
      period: "1m",
    });
    expect(gaining.projection).toBeUndefined();
  });

  it("converts to lb", () => {
    const s = buildWeightSeries({ ...base, unit: "lb", goal: goal(80), period: "1m" });
    expect(s.points[0].value).toBe(toDisplayWeight(weights.at(-31)!.weightKg, "lb"));
    expect(s.target).toBe(176.4);
    expect(s.summary).toMatch(/.lb sur 1 mois/);
  });

  it("is empty without a weighing in the window", () => {
    const s = buildWeightSeries({ ...base, weights: [w(200, 90)], period: "1m" });
    expect(s.points).toEqual([]);
    expect(s.stats).toEqual({
      variation: null,
      secondary: { kind: "rate", value: null },
      count: 0,
    });
    expect(s.summary).toBe("Aucune mesure sur cette période");
    expect(buildWeightSeries({ ...base, weights: [], period: "tout" }).points).toEqual([]);
  });

  it("has no variation with a single weighing", () => {
    const s = buildWeightSeries({ ...base, weights: [w(2, 80)], period: "tout" });
    expect(s.stats.variation).toBeNull();
    expect(s.summary).toMatch(/^Tendance à 80,0.kg sur tout l'historique/);
  });
});

describe("buildSimpleSeries", () => {
  const rows = [
    { date: addDays(TODAY, -200), value: 90 },
    { date: addDays(TODAY, -20), value: 88 },
    { date: addDays(TODAY, -2), value: 86.5 },
  ];

  it("sinceStart uses the whole history, variation the window", () => {
    const s = buildSimpleSeries({ rows, unit: "cm", today: TODAY, period: "1m" });
    expect(s.points.map((p) => p.value)).toEqual([88, 86.5]);
    expect(s.stats.variation).toBe(-1.5);
    expect(s.stats.secondary).toEqual({ kind: "sinceStart", value: -3.5 });
    expect(s.stats.count).toBe(2);
    expect(s.summary).toMatch(/^De 88,0.cm à 86,5.cm sur 1 mois, −1,5.cm$/);
  });

  it("converts to inches and handles body fat", () => {
    const s = buildSimpleSeries({ rows, unit: "in", today: TODAY, period: "tout" });
    expect(s.points[0].value).toBe(35.4);
    const pct = buildSimpleSeries({ rows, unit: "pct", today: TODAY, period: "1m" });
    expect(pct.stats.variation).toBe(-1.5);
    expect(pct.summary).toContain("86,5 %");
  });

  it("handles one value and none", () => {
    const one = buildSimpleSeries({ rows: rows.slice(2), unit: "cm", today: TODAY, period: "3m" });
    expect(one.stats.variation).toBeNull();
    expect(one.stats.secondary.value).toBeNull();
    expect(one.summary).toMatch(/^Une mesure sur 3 mois/);
    const none = buildSimpleSeries({ rows: [], unit: "cm", today: TODAY, period: "3m" });
    expect(none.summary).toBe("Aucune mesure sur cette période");
  });
});
