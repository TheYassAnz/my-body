import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import {
  classifyPace,
  goalReferenceKg,
  goalStatus,
  paceInGoalDirection,
  waistIndicator,
  type GoalSpec,
} from "./goal-status";
import type { WeightPoint } from "./trend";

const TODAY = "2026-10-07";

/** `days + 1` daily weighings ending today, exactly linear. */
const linear = (start: number, perDay: number, days: number): WeightPoint[] =>
  Array.from({ length: days + 1 }, (_, i) => ({
    date: addDays(TODAY, i - days),
    weightKg: start + perDay * i,
  }));

const lose = (rate = 0.5, target = 75): GoalSpec => ({
  type: "lose",
  startWeightKg: 90,
  targetWeightKg: target,
  weeklyRatePct: rate,
});
const gain = (rate = 0.25, target = 90): GoalSpec => ({
  type: "gain",
  startWeightKg: 80,
  targetWeightKg: target,
  weeklyRatePct: rate,
});
const hold = (type: "maintain" | "recomp", startWeightKg: number): GoalSpec => ({
  type,
  startWeightKg,
  targetWeightKg: null,
  weeklyRatePct: null,
});

describe("classifyPace (exact bounds)", () => {
  it("is wrong_direction below zero", () => {
    expect(classifyPace(-0.01, 0.5)).toBe("wrong_direction");
  });
  it("is too_slow below 0.5 × r", () => {
    expect(classifyPace(0.2499, 0.5)).toBe("too_slow");
  });
  it("is on_track at exactly 0.5 × r and at exactly 1.5 × r", () => {
    expect(classifyPace(0.25, 0.5)).toBe("on_track");
    expect(classifyPace(0.75, 0.5)).toBe("on_track");
  });
  it("is too_fast just above 1.5 × r", () => {
    expect(classifyPace(0.75 + 1e-9, 0.5)).toBe("too_fast");
  });
  it("has no absolute ceiling", () => {
    expect(classifyPace(1.3, 1.2)).toBe("on_track");
    expect(classifyPace(0.9, 0.7)).toBe("on_track");
  });
});

describe("paceInGoalDirection", () => {
  it("is −pct for a loss, +pct for a gain, null otherwise", () => {
    expect(paceInGoalDirection("lose", -0.4)).toBe(0.4);
    expect(paceInGoalDirection("gain", 0.4)).toBe(0.4);
    expect(paceInGoalDirection("maintain", 0.4)).toBeNull();
    expect(paceInGoalDirection("recomp", 0.4)).toBeNull();
  });
});

describe("goalReferenceKg", () => {
  it("is null without any weighing", () => {
    expect(goalReferenceKg([], TODAY)).toBeNull();
  });
  it("is the latest weighing while calibrating", () => {
    expect(goalReferenceKg(linear(80, 0.5, 2), TODAY)).toBe(81);
  });
  it("is the trend once calibrated", () => {
    expect(goalReferenceKg(linear(90, -0.05, 30), TODAY)).toBeCloseTo(88.93, 2);
  });
  it("ignores weighings dated after today", () => {
    const points = [...linear(80, 0, 10), { date: addDays(TODAY, 3), weightKg: 120 }];
    expect(goalReferenceKg(points, TODAY)).toBe(80);
  });
});

describe("waistIndicator (specs/03 §5.3)", () => {
  const m = (offset: number, valueCm: number) => ({ date: addDays(TODAY, offset), valueCm });
  it("needs two measurements", () => {
    expect(waistIndicator([], TODAY)).toBe("waist_insufficient");
    expect(waistIndicator([m(-3, 84)], TODAY)).toBe("waist_insufficient");
  });
  it("improves when the waist drops by at least 0.5 cm", () => {
    expect(waistIndicator([m(-20, 84.5), m(-2, 84)], TODAY)).toBe("waist_improving");
  });
  it("is flat for a smaller drop or a rise", () => {
    expect(waistIndicator([m(-20, 84.3), m(-2, 84)], TODAY)).toBe("waist_flat");
    expect(waistIndicator([m(-20, 84), m(-2, 85)], TODAY)).toBe("waist_flat");
  });
  it("compares with the last measurement before the 28-day window", () => {
    expect(waistIndicator([m(-60, 90), m(-40, 86), m(-2, 85.4)], TODAY)).toBe("waist_improving");
  });
  it("ignores measurements dated after today", () => {
    expect(waistIndicator([m(-2, 84), m(3, 80)], TODAY)).toBe("waist_insufficient");
  });
});

describe("goalStatus: lose", () => {
  it("1 · calibrating, with the number of missing weighings", () => {
    const s = goalStatus(lose(), linear(80, 0, 2), TODAY);
    expect(s).toMatchObject({ status: "calibrating", missingEntries: 4 });
  });
  it("1 · calibrating on span alone needs at least one more weighing", () => {
    const s = goalStatus(lose(), linear(80, 0, 6), TODAY);
    expect(s).toMatchObject({ status: "calibrating", missingEntries: 1 });
  });
  it("1 · calibrating beats every other status", () => {
    expect(goalStatus(lose(0.5, 90), linear(80, 0, 2), TODAY).status).toBe("calibrating");
  });
  it("1 · no weighing at all is calibrating", () => {
    expect(goalStatus(lose(), [], TODAY).status).toBe("calibrating");
  });
  it("2 · achieved when the trend is at or under the target", () => {
    expect(goalStatus(lose(0.5, 90), linear(90, -0.05, 30), TODAY).status).toBe("achieved");
  });
  it("2 · achieved beats wrong_direction", () => {
    expect(goalStatus(lose(0.5, 90), linear(80, 0.05, 30), TODAY).status).toBe("achieved");
  });
  it("3 · plateau after 21 days of flat weight", () => {
    expect(goalStatus(lose(), linear(80, 0, 25), TODAY).status).toBe("plateau");
  });
  it("3 · plateau needs 21 days of history: exactly 21 yes, 20 no", () => {
    expect(goalStatus(lose(), linear(80, 0, 20), TODAY).status).toBe("plateau");
    expect(goalStatus(lose(), linear(80, 0, 19), TODAY).status).toBe("too_slow");
  });
  it("3 · plateau beats too_slow", () => {
    expect(goalStatus(lose(), linear(80, -0.002, 25), TODAY).status).toBe("plateau");
  });
  it("4 · wrong_direction when the weight climbs", () => {
    expect(goalStatus(lose(), linear(80, 0.05, 30), TODAY).status).toBe("wrong_direction");
  });
  it("5 · too_fast", () => {
    expect(goalStatus(lose(), linear(90, -0.1, 30), TODAY).status).toBe("too_fast");
  });
  it("6 · too_slow", () => {
    expect(goalStatus(lose(), linear(90, -0.02, 30), TODAY).status).toBe("too_slow");
  });
  it("7 · on_track", () => {
    expect(goalStatus(lose(), linear(90, -0.05, 30), TODAY).status).toBe("on_track");
  });
  it("accepts an aggressive chosen pace without an absolute ceiling", () => {
    expect(goalStatus(lose(1.2), linear(90, -0.1, 30), TODAY).status).toBe("on_track");
  });
  it("throws on a loss goal without target or rate", () => {
    const broken: GoalSpec = { ...lose(), targetWeightKg: null };
    expect(() => goalStatus(broken, linear(90, -0.05, 30), TODAY)).toThrow();
  });
});

describe("goalStatus: gain", () => {
  it("2 · achieved when the trend reaches the target", () => {
    expect(goalStatus(gain(0.25, 75), linear(80, 0.03, 30), TODAY).status).toBe("achieved");
  });
  it("3 · plateau", () => {
    expect(goalStatus(gain(), linear(80, 0, 25), TODAY).status).toBe("plateau");
  });
  it("4 · wrong_direction when the weight drops", () => {
    expect(goalStatus(gain(), linear(80, -0.05, 30), TODAY).status).toBe("wrong_direction");
  });
  it("5 · too_fast", () => {
    expect(goalStatus(gain(), linear(80, 0.08, 30), TODAY).status).toBe("too_fast");
  });
  it("6 · too_slow", () => {
    expect(goalStatus(gain(0.5), linear(80, 0.02, 30), TODAY).status).toBe("too_slow");
  });
  it("7 · on_track", () => {
    expect(goalStatus(gain(), linear(80, 0.03, 30), TODAY).status).toBe("on_track");
  });
});

describe("goalStatus: maintain and recomp", () => {
  const flat = (kg: number) => linear(kg, 0, 10);
  it("calibrating comes first", () => {
    expect(goalStatus(hold("maintain", 80), linear(80, 0, 2), TODAY).status).toBe("calibrating");
  });
  it("stable inside ±1.5 % of the reference, bounds included", () => {
    expect(goalStatus(hold("maintain", 100), flat(101.5), TODAY)).toMatchObject({
      status: "stable",
      deviationKg: 1.5,
    });
    expect(goalStatus(hold("maintain", 100), flat(98.5), TODAY).status).toBe("stable");
  });
  it("out_of_band beyond 1.5 %", () => {
    expect(goalStatus(hold("maintain", 100), flat(101.6), TODAY)).toMatchObject({
      status: "out_of_band",
    });
    expect(goalStatus(hold("maintain", 80), flat(82), TODAY)).toMatchObject({
      status: "out_of_band",
      deviationKg: 2,
    });
  });
  it("maintain carries no waist indicator", () => {
    expect(goalStatus(hold("maintain", 80), flat(80), TODAY).waist).toBeNull();
  });
  it("recomp combines the weight status with each waist state", () => {
    const m = (offset: number, valueCm: number) => ({ date: addDays(TODAY, offset), valueCm });
    const recomp = hold("recomp", 80);
    expect(goalStatus(recomp, flat(80), TODAY)).toMatchObject({
      status: "stable",
      waist: "waist_insufficient",
    });
    expect(goalStatus(recomp, flat(80), TODAY, [m(-20, 85), m(-1, 84)])).toMatchObject({
      status: "stable",
      waist: "waist_improving",
    });
    expect(goalStatus(recomp, flat(83), TODAY, [m(-20, 84), m(-1, 84.1)])).toMatchObject({
      status: "out_of_band",
      waist: "waist_flat",
    });
  });
});
