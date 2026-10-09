import { describe, expect, it } from "vitest";
import {
  cmToIn,
  formatDecimal,
  formatDelta,
  formatInputDecimal,
  formatLength,
  formatLengthDelta,
  formatWeeklyRate,
  formatWeight,
  inToCm,
  parseDecimal,
  round1,
  round2,
  toDisplayLength,
  toDisplayWeight,
  toStoredCm,
  toStoredKg,
} from "./units";

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

describe("parseDecimal", () => {
  it("reads French and English decimals", () => {
    expect(parseDecimal("78,4")).toBe(78.4);
    expect(parseDecimal("78.4")).toBe(78.4);
    expect(parseDecimal(" 80 ")).toBe(80);
  });

  it("returns NaN for anything that is not a plain positive decimal", () => {
    for (const raw of ["", "abc", "1e400", "Infinity", "-5", "1,2,3", "12345", undefined, 42]) {
      expect(parseDecimal(raw)).toBeNaN();
    }
  });
});

describe("rounding", () => {
  it("rounds stored kilograms to two decimals, despite floating point", () => {
    expect(round2(78.015)).toBe(78.02);
    expect(round2(1.005)).toBe(1.01);
  });

  it("returns 0 rather than NaN for tiny values (regression slopes)", () => {
    expect(round1(1e-17)).toBe(0);
    expect(round2(-1e-9)).toBe(0);
  });

  it("keeps NaN as NaN", () => {
    expect(round1(Number.NaN)).toBeNaN();
  });
});

describe("weight conversions", () => {
  it("converts pounds to stored kilograms and back without drift", () => {
    expect(toStoredKg(172, "lb")).toBe(78.02);
    expect(toDisplayWeight(78.02, "lb")).toBe(172);
    expect(toDisplayWeight(78.4, "lb")).toBe(172.8);
    expect(toStoredKg(172.8, "lb")).toBe(78.38);
    expect(toDisplayWeight(78.38, "kg")).toBe(78.4);
  });

  it("rounds kilograms to storage precision", () => {
    expect(toStoredKg(78.456, "kg")).toBe(78.46);
  });
});

describe("fr-FR formatting", () => {
  it("shows one decimal with a comma and a true minus sign", () => {
    expect(formatDecimal(78.4)).toBe("78,4");
    expect(formatDecimal(78)).toBe("78,0");
    expect(formatDecimal(-3.46)).toBe("−3,5");
    expect(formatDecimal(-0.01)).toBe("0,0");
  });

  it("signs differences without a useless zero", () => {
    expect(formatDelta(-3.5)).toBe("−3,5");
    expect(formatDelta(1)).toBe("+1");
    expect(formatDelta(0.04)).toBe("0");
    expect(formatDelta(-0.04)).toBe("0");
  });

  it("formats weights and weekly rates in the display unit", () => {
    expect(formatWeight(78.4, "kg")).toBe("78,4 kg");
    expect(formatWeight(78.4, "lb")).toBe("172,8 lb");
    expect(formatWeeklyRate(-0.35, "kg")).toBe("−0,4 kg/sem");
  });

  it("formats a number field value", () => {
    expect(formatInputDecimal(78)).toBe("78,0");
    expect(formatInputDecimal(172.84)).toBe("172,8");
  });
});

describe("length units", () => {
  it("stores centimetres as typed and converts inches with the exact factor (1 decimal)", () => {
    expect(toStoredCm(84.5, "cm")).toBe(84.5);
    expect(toStoredCm(33.3, "in")).toBe(84.6); // 33.3 × 2.54 = 84.582
    expect(toStoredCm(3.9, "in")).toBe(9.9);
  });

  it("round-trips cm → in → cm without drifting past the storage precision", () => {
    for (const cm of [10, 33.3, 84.5, 100, 249.9, 250]) {
      expect(toStoredCm(toDisplayLength(cm, "in"), "in")).toBeCloseTo(cm, 0);
    }
  });

  it("displays in the profile unit", () => {
    expect(toDisplayLength(84.5, "cm")).toBe(84.5);
    expect(toDisplayLength(84.5, "in")).toBe(33.3);
  });

  it("formats a length like a weight: one decimal, French separator, narrow no-break space", () => {
    expect(formatLength(84.5, "cm")).toBe(formatWeight(84.5, "kg").replace("kg", "cm"));
    expect(formatLength(84.5, "cm")).toMatch(/^84,5\s?cm$/);
    expect(formatLength(84.5, "in")).toMatch(/^33,3\s?in$/);
  });

  it("formats a signed difference without a useless zero", () => {
    expect(formatLengthDelta(-3.5, "cm")).toMatch(/^−3,5\s?cm$/);
    expect(formatLengthDelta(1, "cm")).toMatch(/^\+1\s?cm$/);
    expect(formatLengthDelta(0, "cm")).toMatch(/^0\s?cm$/);
    expect(formatLengthDelta(2.54, "in")).toMatch(/^\+1\s?in$/);
  });
});
