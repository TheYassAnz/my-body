import { describe, expect, it } from "vitest";
import { deltaTone, featuredZones, measureDelta, zoneDelta, ZONES } from "./deltas";

const TODAY = "2026-10-03";
const m = (date: string, valueCm: number) => ({ date, valueCm });

describe("ZONES", () => {
  it("keeps the fixed session order (specs/04, specs/01 §3.5)", () => {
    expect([...ZONES]).toEqual([
      "neck",
      "shoulders",
      "chest",
      "arm",
      "waist",
      "hips",
      "thigh",
      "calf",
    ]);
  });
});

describe("measureDelta", () => {
  it("rounds to one decimal", () => {
    expect(measureDelta(84.4, 84.7)).toBe(0.3); // 84.7 − 84.4 = 0.29999999999999716
    expect(measureDelta(88, 84.5)).toBe(-3.5);
  });
  it("treats a change below 0.3 cm as zero, 0.3 itself as a change", () => {
    expect(measureDelta(84, 84.2)).toBe(0);
    expect(measureDelta(84, 83.8)).toBe(0);
    expect(measureDelta(84, 84.3)).toBe(0.3);
    expect(measureDelta(84, 83.7)).toBe(-0.3);
  });
  it("never returns negative zero", () => {
    expect(Object.is(measureDelta(84, 83.9), 0)).toBe(true);
  });
});

describe("deltaTone (specs/03 §6 matrix)", () => {
  const T = "positive";
  const N = "neutral";
  it.each([
    // zone, goal, delta, expected
    ["waist", "lose", -1, T],
    ["waist", "lose", 1, N],
    ["waist", "recomp", -1, T],
    ["waist", "gain", -1, N],
    ["waist", "maintain", -1, N],
    ["hips", "lose", -1, T],
    ["hips", "recomp", -1, T],
    ["hips", "gain", -1, N],
    ["neck", "lose", -1, T],
    ["neck", "recomp", -1, N],
    ["neck", "gain", 1, N],
    ["chest", "gain", 1, T],
    ["chest", "recomp", 1, T],
    ["chest", "lose", 1, N],
    ["chest", "gain", -1, N],
    ["shoulders", "gain", 1, T],
    ["arm", "recomp", 1, T],
    ["thigh", "gain", 1, T],
    ["thigh", "lose", 1, N],
    ["calf", "recomp", 1, T],
    ["calf", "maintain", 1, N],
  ] as const)("%s · %s · %s cm → %s", (zone, goal, delta, expected) => {
    expect(deltaTone(zone, delta, goal)).toBe(expected);
  });

  it("is neutral without goal, without delta, and for a zero delta", () => {
    expect(deltaTone("waist", -2, null)).toBe(N);
    expect(deltaTone("waist", null, "lose")).toBe(N);
    expect(deltaTone("waist", 0, "lose")).toBe(N);
  });
});

describe("zoneDelta (specs/03 §6)", () => {
  const waist = [m("2026-08-20", 90), m("2026-09-10", 88), m("2026-10-01", 86.5)];

  it("has nothing for a zone that was never measured", () => {
    expect(zoneDelta("waist", [], 30, TODAY, "lose")).toEqual({
      current: null,
      reference: null,
      deltaCm: null,
      tone: "neutral",
    });
  });

  it("current = latest measure; reference = latest measure at most today − P", () => {
    // 30 d → limit 2026-09-03 → 2026-08-20 (90 cm)
    expect(zoneDelta("waist", waist, 30, TODAY, "lose")).toEqual({
      current: m("2026-10-01", 86.5),
      reference: m("2026-08-20", 90),
      deltaCm: -3.5,
      tone: "positive",
    });
    // 7 d → limit 2026-09-26 → 2026-09-10 (88 cm)
    expect(zoneDelta("waist", waist, 7, TODAY, "lose").deltaCm).toBe(-1.5);
  });

  it("a measure dated exactly today − P is a valid reference", () => {
    const edge = [m("2026-09-03", 90), m("2026-10-01", 86)];
    expect(zoneDelta("waist", edge, 30, TODAY, "lose").reference).toEqual(m("2026-09-03", 90));
  });

  it("falls back to the first measure when none is old enough", () => {
    const recent = [m("2026-09-25", 90), m("2026-10-01", 88)];
    expect(zoneDelta("waist", recent, 30, TODAY, "lose")).toMatchObject({
      reference: m("2026-09-25", 90),
      deltaCm: -2,
    });
  });

  it("'start' compares with the very first measure", () => {
    expect(zoneDelta("waist", waist, "start", TODAY, "lose")).toMatchObject({
      reference: m("2026-08-20", 90),
      deltaCm: -3.5,
    });
  });

  it("shows no delta when current and reference are the same measure", () => {
    expect(zoneDelta("waist", [m("2026-10-01", 86)], 30, TODAY, "lose")).toEqual({
      current: m("2026-10-01", 86),
      reference: null,
      deltaCm: null,
      tone: "neutral",
    });
    expect(zoneDelta("waist", [m("2026-10-01", 86)], "start", TODAY, "lose").deltaCm).toBeNull();
  });

  it("ignores measures dated after today and sorts unsorted input", () => {
    const shuffled = [m("2026-10-01", 86.5), m("2026-12-01", 10), m("2026-08-20", 90)];
    expect(zoneDelta("waist", shuffled, 30, TODAY, "lose")).toMatchObject({
      current: m("2026-10-01", 86.5),
      deltaCm: -3.5,
    });
  });

  it("flattens a change below 0.3 cm to 0, grey", () => {
    const flat = [m("2026-08-20", 90), m("2026-10-01", 89.8)];
    expect(zoneDelta("waist", flat, 30, TODAY, "lose")).toMatchObject({
      deltaCm: 0,
      tone: "neutral",
    });
  });

  it("is grey when the change goes against the goal, and without goal", () => {
    const up = [m("2026-08-20", 86), m("2026-10-01", 90)];
    expect(zoneDelta("waist", up, 30, TODAY, "lose").tone).toBe("neutral");
    expect(zoneDelta("waist", waist, 30, TODAY, null).tone).toBe("neutral");
  });
});

describe("featuredZones (specs/03 §6)", () => {
  it("returns the three zones of each goal type", () => {
    expect(featuredZones("lose")).toEqual(["waist", "hips", "thigh"]);
    expect(featuredZones("gain")).toEqual(["arm", "shoulders", "chest"]);
    expect(featuredZones("recomp")).toEqual(["waist", "arm", "shoulders"]);
    expect(featuredZones("maintain")).toEqual(["waist", "hips", "arm"]);
  });
  it("falls back to the maintenance zones without a goal", () => {
    expect(featuredZones(null)).toEqual(["waist", "hips", "arm"]);
  });
});
