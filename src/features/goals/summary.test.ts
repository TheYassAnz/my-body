import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import type { Goal } from "./queries";
import { buildGoalHistory, buildGoalSummary } from "./summary";

const TODAY = "2026-10-07";
const linear = (start: number, perDay: number, days: number) =>
  Array.from({ length: days + 1 }, (_, i) => ({
    date: addDays(TODAY, i - days),
    weightKg: start + perDay * i,
  }));
const lose = {
  type: "lose" as const,
  startDate: "2026-09-01",
  startWeightKg: 90,
  targetWeightKg: 80,
  weeklyRatePct: 0.5,
};

describe("buildGoalSummary", () => {
  it("is 'none' without an active goal, whatever the weighings", () => {
    expect(buildGoalSummary(null, linear(80, 0, 20), TODAY)).toEqual({ state: "none" });
    expect(buildGoalSummary(null, [], TODAY)).toEqual({ state: "none" });
  });

  it("describes an on-track loss: status, progress, projection, rate", () => {
    const s = buildGoalSummary(lose, linear(90, -0.05, 30), TODAY);
    expect(s).toMatchObject({
      state: "active",
      type: "lose",
      targetKg: 80,
      startKg: 90,
      status: { status: "on_track" },
      projection: { kind: "estimated" },
    });
    if (s.state !== "active") throw new Error("unreachable");
    expect(s.referenceKg).toBeCloseTo(88.93, 2);
    expect(s.progress?.doneKg).toBeCloseTo(1.07, 2);
    expect(s.progress?.totalKg).toBe(10);
    expect(s.progress?.ratio).toBeCloseTo(0.107, 3);
    expect(s.rate?.pctPerWeek).toBeCloseTo(-0.394, 2);
  });

  it("while calibrating: latest weighing as reference, no rate, no projection", () => {
    const s = buildGoalSummary(lose, linear(88, 0, 2), TODAY);
    expect(s).toMatchObject({
      state: "active",
      referenceKg: 88,
      rate: null,
      status: { status: "calibrating", missingEntries: 4 },
      projection: { kind: "unavailable" },
    });
  });

  it("clamps the done distance at zero when the weight moved the wrong way", () => {
    const s = buildGoalSummary(lose, linear(92, 0, 20), TODAY);
    if (s.state !== "active") throw new Error("unreachable");
    expect(s.progress).toMatchObject({ doneKg: 0, ratio: 0 });
  });

  it("caps the done distance at the total when the reference overshoots the target", () => {
    const s = buildGoalSummary(lose, linear(78.8, 0, 20), TODAY);
    if (s.state !== "active") throw new Error("unreachable");
    expect(s.progress).toMatchObject({ doneKg: 10, totalKg: 10, ratio: 1 });
  });

  it("has no progress bar for maintain and recomp", () => {
    const s = buildGoalSummary(
      {
        type: "maintain",
        startDate: "2026-09-01",
        startWeightKg: 80,
        targetWeightKg: null,
        weeklyRatePct: null,
      },
      linear(80, 0, 10),
      TODAY,
    );
    expect(s).toMatchObject({ state: "active", progress: null, status: { status: "stable" } });
  });

  it("works for a goal whose start weight is missing from the weighings (no weighing at all)", () => {
    expect(buildGoalSummary(lose, [], TODAY)).toMatchObject({
      state: "active",
      referenceKg: 90,
      status: { status: "calibrating" },
    });
  });
});

describe("buildGoalHistory", () => {
  const past = (over: Partial<Goal>): Goal => ({
    id: "g1",
    userId: "alice",
    type: "lose",
    status: "archived",
    startDate: "2026-09-01",
    startWeightKg: 90,
    targetWeightKg: 80,
    weeklyRatePct: 0.5,
    endedAt: "2026-09-30",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

  it("reports the trend at the end date, ignoring later weighings", () => {
    const points = [...linear(90, 0, 20), { date: addDays(TODAY, 5), weightKg: 120 }];
    const history = buildGoalHistory([past({ endedAt: TODAY })], points);
    expect(history).toEqual([
      {
        id: "g1",
        type: "lose",
        status: "archived",
        startDate: "2026-09-01",
        endedAt: TODAY,
        startKg: 90,
        endKg: 90,
      },
    ]);
  });

  it("has no end weight when nothing was weighed by then", () => {
    expect(
      buildGoalHistory([past({ endedAt: "2026-01-01" })], linear(90, 0, 5))[0].endKg,
    ).toBeNull();
  });

  it("skips an active goal if one slips in", () => {
    expect(buildGoalHistory([past({ status: "active", endedAt: null })], [])).toEqual([]);
  });
});
