import { describe, expect, it } from "vitest";
import { suspiciousDeviation } from "./suspicious";

const p = (date: string, weightKg: number) => ({ date, weightKg });
const three = [p("2026-01-01", 78.4), p("2026-01-02", 78.4), p("2026-01-03", 78.4)];

describe("suspiciousDeviation", () => {
  it("needs a trend: fewer than 3 weighings never warn", () => {
    expect(suspiciousDeviation(three.slice(0, 2), 50)).toBeNull();
  });

  it("returns the signed gap in kg beyond 5 % (specs/01 §3.3 example)", () => {
    expect(suspiciousDeviation(three, 72)).toBeCloseTo(-6.4, 10);
    expect(suspiciousDeviation(three, 82.4)).toBeCloseTo(4, 10);
  });

  it("accepts values within 5 % of the trend", () => {
    expect(suspiciousDeviation(three, 82.3)).toBeNull();
    expect(suspiciousDeviation(three, 74.5)).toBeNull();
  });
});
