import { describe, expect, it } from "vitest";
import { cmToIn, inToCm, round1 } from "./units";

describe("units", () => {
  it("converts inches to centimetres with the exact factor", () => {
    expect(inToCm(70)).toBe(177.8);
  });

  it("round-trips at storage precision", () => {
    expect(inToCm(cmToIn(177.8))).toBe(177.8);
  });

  it("rounds half away from zero to one decimal, despite floating point", () => {
    expect(round1(168.45)).toBe(168.5);
    expect(round1(168.44)).toBe(168.4);
    expect(round1(-3.25)).toBe(-3.3);
  });
});
