import { describe, expect, it } from "vitest";
import { defaultPeriod, periodStats, PROGRESS_PERIODS, windowStart } from "./series";

const TODAY = "2026-10-09";
const v = (date: string, value: number) => ({ date, value });

describe("windowStart", () => {
  it("goes back by the period length", () => {
    expect(windowStart("3m", TODAY, "2025-01-01")).toBe("2026-07-11");
    expect(windowStart("1m", TODAY, null)).toBe("2026-09-09");
  });
  it("starts at the first date for 'tout', null without data", () => {
    expect(windowStart("tout", TODAY, "2026-08-01")).toBe("2026-08-01");
    expect(windowStart("tout", TODAY, null)).toBeNull();
  });
  it("lists the five periods", () => {
    expect(PROGRESS_PERIODS.map((p) => p.param)).toEqual(["1m", "3m", "6m", "1a", "tout"]);
  });
});

describe("defaultPeriod", () => {
  it("uses 'tout' under 90 days of history", () => {
    expect(defaultPeriod("2026-08-30", TODAY)).toBe("tout");
  });
  it("uses 3m with longer history or none", () => {
    expect(defaultPeriod("2026-03-23", TODAY)).toBe("3m");
    expect(defaultPeriod(null, TODAY)).toBe("3m");
  });
});

describe("periodStats", () => {
  it("is empty without values", () => {
    expect(periodStats([])).toEqual({ variation: null, count: 0, first: null, last: null });
  });
  it("has no variation with one value", () => {
    expect(periodStats([v("2026-10-01", 80)])).toEqual({
      variation: null,
      count: 1,
      first: 80,
      last: 80,
    });
  });
  it("subtracts first from last", () => {
    const s = periodStats([v("2026-10-01", 82), v("2026-10-05", 80), v("2026-10-09", 78.5)]);
    expect(s).toEqual({ variation: -3.5, count: 3, first: 82, last: 78.5 });
  });
  it("counts a value exactly at the window start", () => {
    const start = windowStart("3m", TODAY, null)!;
    expect(periodStats([v(start, 80), v(TODAY, 79)]).count).toBe(2);
  });
});

describe("defaultPeriod boundary", () => {
  it("89 days -> tout, 90 days -> 3m", () => {
    expect(defaultPeriod("2026-07-12", TODAY)).toBe("tout");
    expect(defaultPeriod("2026-07-11", TODAY)).toBe("3m");
  });
});
