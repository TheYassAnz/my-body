import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDashboard } from "@/features/dashboard/queries";
import { createGoal } from "@/features/goals/queries";
import { upsertMeasure } from "@/features/measurements/queries";
import { insertWeights, upsertWeight } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("getDashboard", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  it("summarises the caller's weighings only", async () => {
    await insertWeights(
      db,
      "alice",
      [
        "2026-09-21",
        "2026-09-23",
        "2026-09-25",
        "2026-09-27",
        "2026-09-29",
        "2026-09-30",
        "2026-10-01",
        "2026-10-02",
      ].map((date, i) => ({ date, weightKg: 80 - i * 0.2, bodyFatPct: null, note: null })),
    );
    await upsertWeight(db, "bob", {
      date: "2026-10-03",
      weightKg: 120,
      bodyFatPct: null,
      note: null,
    });

    const { weight } = await getDashboard(db, "alice", "2026-10-03");
    expect(weight).toMatchObject({ state: "ready", todayKg: null });
    expect(weight.state === "ready" && weight.trendKg).toBeLessThan(80);
    expect((await getDashboard(db, "bob", "2026-10-03")).weight).toMatchObject({
      state: "calibrating",
      todayKg: 120,
    });
  });

  it("has no goal for an account created before L3", async () => {
    await insertWeights(
      db,
      "alice",
      [
        "2026-09-21",
        "2026-09-23",
        "2026-09-25",
        "2026-09-27",
        "2026-09-29",
        "2026-09-30",
        "2026-10-01",
        "2026-10-02",
      ].map((date, i) => ({ date, weightKg: 80 - i * 0.2, bodyFatPct: null, note: null })),
    );
    expect((await getDashboard(db, "alice", "2026-10-03")).goal).toEqual({ state: "none" });
  });

  it("summarises the caller's active goal only", async () => {
    await createGoal(db, "bob", {
      type: "gain",
      startDate: "2026-09-01",
      startWeightKg: 60,
      targetWeightKg: 70,
      weeklyRatePct: 0.25,
    });
    await createGoal(db, "alice", {
      type: "lose",
      startDate: "2026-09-01",
      startWeightKg: 82,
      targetWeightKg: 75,
      weeklyRatePct: 0.5,
    });
    const { goal } = await getDashboard(db, "alice", "2026-10-03");
    expect(goal).toMatchObject({
      state: "active",
      type: "lose",
      targetKg: 75,
      status: { status: "calibrating" },
    });
    expect((await getDashboard(db, "bob", "2026-10-03")).goal).toMatchObject({
      state: "active",
      type: "gain",
      targetKg: 70,
    });
  });
});

describe("getDashboard · measurements (L4)", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  const measure = (userId: string, date: string, zone: "waist" | "hips", valueCm: number) =>
    upsertMeasure(db, userId, { date, zone, valueCm });

  it("is an empty block for an account that never measured", async () => {
    expect((await getDashboard(db, "alice", "2026-10-03")).measures).toEqual({ state: "empty" });
  });

  it("shows the caller's measures only", async () => {
    await measure("alice", "2026-10-01", "waist", 86.5);
    await measure("bob", "2026-10-02", "waist", 120);
    const alice = (await getDashboard(db, "alice", "2026-10-03")).measures;
    expect(alice.state === "ready" && alice.reminder.lastSessionDate).toBe("2026-10-01");
    expect((await getDashboard(db, "bob", "2026-10-03")).measures).toMatchObject({
      state: "ready",
    });
  });

  it("applies the profile's unit and measure day", async () => {
    await measure("alice", "2026-10-01", "waist", 86.5);
    const { measures } = await getDashboard(db, "alice", "2026-10-03", {
      lengthUnit: "in",
      reminderWeekday: 0,
    });
    expect(measures.state === "ready" && measures.zones[0].valueText).toMatch(/^34,1.in$/);
    expect(measures.state === "ready" && measures.reminder.nextLabel).toBe("lundi");
  });

  it("feeds the waist indicator of a recomposition goal", async () => {
    await createGoal(db, "alice", {
      type: "recomp",
      startDate: "2026-09-01",
      startWeightKg: 80,
      targetWeightKg: null,
      weeklyRatePct: null,
    });
    expect((await getDashboard(db, "alice", "2026-10-03")).goal).toMatchObject({
      status: { waist: "waist_insufficient" },
    });
    await measure("alice", "2026-09-01", "waist", 94);
    await measure("alice", "2026-09-30", "waist", 92);
    expect((await getDashboard(db, "alice", "2026-10-03")).goal).toMatchObject({
      status: { waist: "waist_improving" },
    });
  });

  it("does not use another user's waist for the indicator", async () => {
    await createGoal(db, "alice", {
      type: "recomp",
      startDate: "2026-09-01",
      startWeightKg: 80,
      targetWeightKg: null,
      weeklyRatePct: null,
    });
    await measure("bob", "2026-09-01", "waist", 94);
    await measure("bob", "2026-09-30", "waist", 92);
    expect((await getDashboard(db, "alice", "2026-10-03")).goal).toMatchObject({
      status: { waist: "waist_insufficient" },
    });
  });
});
