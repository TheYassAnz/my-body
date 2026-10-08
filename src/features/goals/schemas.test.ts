import { describe, expect, it } from "vitest";
import { goalInputSchema } from "./schemas";

const REF = 80;
const parse = (input: Record<string, string>) =>
  goalInputSchema(REF).safeParse({ unit: "kg", ...input });
const errors = (input: Record<string, string>) => {
  const r = parse(input);
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
};

describe("goalInputSchema", () => {
  it("accepts a loss goal with a French decimal", () => {
    expect(parse({ type: "lose", target: "75,5", rate: "0,5" })).toMatchObject({
      success: true,
      data: { type: "lose", targetWeightKg: 75.5, weeklyRatePct: 0.5 },
    });
  });

  it("accepts a gain goal", () => {
    expect(parse({ type: "gain", target: "85", rate: "0.25" })).toMatchObject({
      success: true,
      data: { type: "gain", targetWeightKg: 85, weeklyRatePct: 0.25 },
    });
  });

  it("converts a target typed in pounds to kilograms", () => {
    const r = goalInputSchema(REF).safeParse({
      type: "lose",
      target: "165",
      rate: "0.5",
      unit: "lb",
    });
    expect(r).toMatchObject({ success: true, data: { targetWeightKg: 74.84 } });
  });

  it("snaps the rate to the 0.05 step", () => {
    expect(parse({ type: "lose", target: "75", rate: "0,37" })).toMatchObject({
      data: { weeklyRatePct: 0.35 },
    });
  });

  it("ignores target and rate for maintain and recomp", () => {
    for (const type of ["maintain", "recomp"]) {
      expect(parse({ type, target: "abc", rate: "99" })).toMatchObject({
        success: true,
        data: { type, targetWeightKg: null, weeklyRatePct: null },
      });
    }
  });

  it("rejects a loss target at or above the current weight", () => {
    expect(errors({ type: "lose", target: "80", rate: "0.5" }).target).toMatch(/inférieure/);
    expect(errors({ type: "lose", target: "81", rate: "0.5" }).target).toMatch(/inférieure/);
  });

  it("rejects a gain target at or below the current weight", () => {
    expect(errors({ type: "gain", target: "80", rate: "0.25" }).target).toMatch(/supérieure/);
    expect(errors({ type: "gain", target: "70", rate: "0.25" }).target).toMatch(/supérieure/);
  });

  it("rejects targets outside 20-400 kg", () => {
    expect(errors({ type: "lose", target: "19,9", rate: "0.5" }).target).toBeDefined();
    expect(errors({ type: "gain", target: "400,1", rate: "0.25" }).target).toBeDefined();
  });

  it("rejects absurd, negative and empty targets without producing NaN", () => {
    for (const target of ["1e400", "Infinity", "-80", "", "abc", "NaN"]) {
      expect(errors({ type: "lose", target, rate: "0.5" }).target, target).toBeDefined();
    }
  });

  it("rejects a rate outside the bounds of the type", () => {
    expect(errors({ type: "lose", target: "75", rate: "0,2" }).rate).toBeDefined();
    expect(errors({ type: "lose", target: "75", rate: "1,6" }).rate).toBeDefined();
    expect(errors({ type: "gain", target: "85", rate: "0,05" }).rate).toBeDefined();
    expect(errors({ type: "gain", target: "85", rate: "0,3" }).rate).toBeUndefined();
    expect(errors({ type: "gain", target: "85", rate: "0,8" }).rate).toBeDefined();
  });

  it("rejects absurd and empty rates", () => {
    for (const rate of ["", "abc", "1e400", "-0.5"]) {
      expect(errors({ type: "lose", target: "75", rate }).rate, rate).toBeDefined();
    }
  });

  it("rejects an unknown type", () => {
    expect(errors({ type: "bulk" }).type).toBeDefined();
    expect(errors({}).type).toBeDefined();
  });

  it("never lets a non-finite number through", () => {
    for (const rate of ["Infinity", "1e400", "NaN"]) {
      const r = parse({ type: "gain", target: "85", rate });
      expect(r.success, rate).toBe(false);
    }
  });
});
