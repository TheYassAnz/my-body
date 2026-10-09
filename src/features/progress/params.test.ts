import { describe, expect, it } from "vitest";
import { ZONES } from "@/lib/metrics";
import { parseProgressParams, progressHref } from "./params";

describe("parseProgressParams", () => {
  it("defaults on empty or unknown input", () => {
    expect(parseProgressParams({})).toEqual({ metric: "weight", period: null, rows: 50 });
    expect(parseProgressParams({ m: "zzz", p: "-3" })).toEqual({
      metric: "weight",
      period: null,
      rows: 50,
    });
  });

  it("accepts known metrics and periods", () => {
    expect(parseProgressParams({ m: "bodyFat", p: "1a" })).toMatchObject({
      metric: "bodyFat",
      period: "1a",
    });
    for (const z of ZONES) expect(parseProgressParams({ m: z }).metric).toBe(z);
  });

  it.each([
    ["abc", 50],
    ["0", 50],
    ["-5", 50],
    ["1e9", 1000],
    ["Infinity", 1000],
    ["75", 100],
    ["50", 50],
    ["150", 150],
    ["1000", 1000],
  ])("rows %s -> %i", (n, rows) => {
    expect(parseProgressParams({ n }).rows).toBe(rows);
  });
});

describe("progressHref", () => {
  const base = parseProgressParams({});
  it("omits defaults", () => {
    expect(progressHref({}, base)).toBe("/progres");
    expect(progressHref({ metric: "weight", rows: 50 }, base)).toBe("/progres");
  });
  it("keeps other params", () => {
    const cur = parseProgressParams({ m: "waist", p: "6m", n: "100" });
    expect(progressHref({ rows: 150 }, cur)).toBe("/progres?m=waist&p=6m&n=150");
    expect(progressHref({ metric: "weight" }, cur)).toBe("/progres?p=6m&n=100");
  });
});
