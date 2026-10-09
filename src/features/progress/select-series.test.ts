import { describe, expect, it } from "vitest";
import { isFavourable } from "./select-series";

describe("isFavourable", () => {
  it.each([
    ["weight", -1, "lose", true],
    ["weight", 1, "lose", false],
    ["weight", 1, "gain", true],
    ["weight", -1, "gain", false],
    ["weight", -1, "maintain", false],
    ["bodyFat", -1, "recomp", true],
    ["bodyFat", 1, "lose", false],
    ["waist", -1, "lose", true],
    ["waist", 1, "lose", false],
    ["arm", 1, "gain", true],
    ["weight", 0, "lose", false],
    ["weight", null, "lose", false],
    ["weight", -1, null, false],
  ] as const)("%s %s with goal %s -> %s", (metric, v, goal, expected) => {
    expect(isFavourable(metric, v, goal)).toBe(expected);
  });
});
