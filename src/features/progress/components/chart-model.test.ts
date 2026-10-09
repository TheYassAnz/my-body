import { describe, expect, it } from "vitest";
import type { ProgressSeries } from "../build-series";
import { chartModel, tooltipInfo } from "./chart-model";

const series: ProgressSeries = {
  points: [
    { date: "2026-10-01", value: 82, note: "matin" },
    { date: "2026-10-03", value: 78 },
  ],
  trend: [
    { date: "2026-10-01", value: 82 },
    { date: "2026-10-02", value: 81 },
    { date: "2026-10-03", value: 80 },
  ],
  target: 70,
  projection: {
    from: { date: "2026-10-03", value: 80 },
    to: { date: "2026-12-01", value: 70 },
  },
  stats: { variation: -2, secondary: { kind: "rate", value: null }, count: 2 },
  summary: "",
};

describe("chartModel", () => {
  it("puts a target outside the data range, and the projection end, in the domains", () => {
    const { domain, end, data } = chartModel(series);
    expect(domain[0]).toBeLessThan(70);
    expect(domain[1]).toBeGreaterThan(82);
    expect(end).toBe(Date.parse("2026-12-01T00:00:00Z"));
    expect(data).toHaveLength(3);
  });
});

describe("tooltipInfo", () => {
  const { data } = chartModel(series);
  it("shows raw value and note on a weighing day", () => {
    expect(tooltipInfo(data[0], "kg")).toEqual({ text: "82,0 kg", note: "matin" });
  });
  it("shows the labelled trend on a day without weighing", () => {
    expect(tooltipInfo(data[1], "kg")).toEqual({ text: "Tendance 81,0 kg" });
  });
});
