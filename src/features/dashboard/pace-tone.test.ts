import { describe, expect, it } from "vitest";
import type { GoalSummary } from "@/features/goals/summary";
import { paceTone } from "./pace-tone";
import type { WeightSummary } from "./weight-summary";

const sparkline = { from: "2026-07-10", to: "2026-10-07", dots: [], trend: [] };
const ready = (pctPerWeek: number): WeightSummary => ({
  state: "ready",
  trendKg: 80,
  todayKg: null,
  rate: { kgPerWeek: (pctPerWeek / 100) * 80, pctPerWeek },
  sparkline,
});
const goal = (type: "lose" | "gain" | "maintain" | "recomp"): GoalSummary => ({
  state: "active",
  type,
  targetKg: type === "lose" || type === "gain" ? 75 : null,
  weeklyRatePct: null,
  startKg: 80,
  startDate: "2026-09-01",
  referenceKg: 80,
  status: { status: "on_track", missingEntries: 0, deviationKg: null, waist: null },
  progress: null,
  projection: { kind: "unavailable" },
  rate: null,
});

describe("paceTone", () => {
  it("is positive when the pace goes the way of the goal", () => {
    expect(paceTone(goal("lose"), ready(-0.4))).toBe("positive");
    expect(paceTone(goal("gain"), ready(0.3))).toBe("positive");
  });
  it("is neutral when it goes the other way or does not move", () => {
    expect(paceTone(goal("lose"), ready(0.4))).toBe("neutral");
    expect(paceTone(goal("lose"), ready(0))).toBe("neutral");
    expect(paceTone(goal("gain"), ready(-0.3))).toBe("neutral");
  });
  it("is neutral for maintain, recomp and without a goal", () => {
    expect(paceTone(goal("maintain"), ready(-0.4))).toBe("neutral");
    expect(paceTone(goal("recomp"), ready(-0.4))).toBe("neutral");
    expect(paceTone({ state: "none" }, ready(-0.4))).toBe("neutral");
  });
  it("is neutral while calibrating or without a rate", () => {
    expect(paceTone(goal("lose"), { state: "empty" })).toBe("neutral");
    expect(paceTone(goal("lose"), { ...ready(-0.4), rate: null } as WeightSummary)).toBe("neutral");
  });
});
