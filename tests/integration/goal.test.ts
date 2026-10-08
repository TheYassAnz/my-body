import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createGoal,
  finishActiveGoal,
  getActiveGoal,
  listPastGoals,
  replaceActiveGoal,
  updateActiveGoalTarget,
  type NewGoal,
} from "@/features/goals/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

const loseGoal: NewGoal = {
  type: "lose",
  startDate: "2026-09-01",
  startWeightKg: 90,
  targetWeightKg: 80,
  weeklyRatePct: 0.5,
};
const maintainGoal: NewGoal = {
  type: "maintain",
  startDate: "2026-10-03",
  startWeightKg: 84.5,
  targetWeightKg: null,
  weeklyRatePct: null,
};

describe("goals", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  it("creates an active goal and reads it back", async () => {
    await createGoal(db, "alice", loseGoal);
    expect(await getActiveGoal(db, "alice")).toMatchObject({
      ...loseGoal,
      status: "active",
      endedAt: null,
    });
  });

  it("returns null without an active goal", async () => {
    expect(await getActiveGoal(db, "alice")).toBeNull();
  });

  it("refuses a second active goal (partial unique index)", async () => {
    await createGoal(db, "alice", loseGoal);
    await expect(createGoal(db, "alice", maintainGoal)).rejects.toThrow();
    expect(await listPastGoals(db, "alice")).toHaveLength(0);
  });

  it("lets two users each have an active goal", async () => {
    await createGoal(db, "alice", loseGoal);
    await createGoal(db, "bob", maintainGoal);
    expect((await getActiveGoal(db, "bob"))?.type).toBe("maintain");
  });

  it("replaces the active goal: the old one is archived, the new one is active", async () => {
    await createGoal(db, "alice", loseGoal);
    await replaceActiveGoal(db, "alice", maintainGoal, "archived", "2026-10-03");
    expect((await getActiveGoal(db, "alice"))?.type).toBe("maintain");
    expect(await listPastGoals(db, "alice")).toMatchObject([
      { type: "lose", status: "archived", endedAt: "2026-10-03" },
    ]);
  });

  it("replaces by marking the old goal achieved", async () => {
    await createGoal(db, "alice", loseGoal);
    await replaceActiveGoal(db, "alice", maintainGoal, "achieved", "2026-10-03");
    expect((await listPastGoals(db, "alice"))[0].status).toBe("achieved");
  });

  it("rolls back when the insert fails: the old goal stays active", async () => {
    await createGoal(db, "alice", loseGoal);
    // A maintain goal with a target breaks the target/rate CHECK.
    const broken: NewGoal = { ...maintainGoal, targetWeightKg: 80 };
    await expect(
      replaceActiveGoal(db, "alice", broken, "archived", "2026-10-03"),
    ).rejects.toThrow();
    expect((await getActiveGoal(db, "alice"))?.type).toBe("lose");
    expect(await listPastGoals(db, "alice")).toHaveLength(0);
  });

  it("finishes the active goal without creating another", async () => {
    await createGoal(db, "alice", loseGoal);
    expect(await finishActiveGoal(db, "alice", "achieved", "2026-10-03")).toBe(true);
    expect(await getActiveGoal(db, "alice")).toBeNull();
    expect(await finishActiveGoal(db, "alice", "achieved", "2026-10-03")).toBe(false);
  });

  it("updates the target and rate of the active goal in place", async () => {
    await createGoal(db, "alice", loseGoal);
    const before = await getActiveGoal(db, "alice");
    expect(
      await updateActiveGoalTarget(db, "alice", { targetWeightKg: 78, weeklyRatePct: 0.75 }),
    ).toBe(true);
    const after = await getActiveGoal(db, "alice");
    expect(after).toMatchObject({ id: before?.id, targetWeightKg: 78, weeklyRatePct: 0.75 });
    expect(after?.startWeightKg).toBe(90);
  });

  it("lists past goals, most recent first", async () => {
    await createGoal(db, "alice", { ...loseGoal, startDate: "2026-01-01" });
    await replaceActiveGoal(
      db,
      "alice",
      { ...loseGoal, startDate: "2026-05-01" },
      "archived",
      "2026-04-30",
    );
    await replaceActiveGoal(db, "alice", maintainGoal, "archived", "2026-10-03");
    expect((await listPastGoals(db, "alice")).map((g) => g.startDate)).toEqual([
      "2026-05-01",
      "2026-01-01",
    ]);
  });

  describe("isolation", () => {
    beforeEach(async () => {
      await createGoal(db, "bob", { ...maintainGoal, startWeightKg: 95 });
    });

    it("never reads another user's goals", async () => {
      expect(await getActiveGoal(db, "alice")).toBeNull();
      expect(await listPastGoals(db, "alice")).toEqual([]);
    });

    it("never updates or finishes another user's goal", async () => {
      expect(
        await updateActiveGoalTarget(db, "alice", { targetWeightKg: 70, weeklyRatePct: 0.5 }),
      ).toBe(false);
      expect(await finishActiveGoal(db, "alice", "archived", "2026-10-03")).toBe(false);
      expect(await getActiveGoal(db, "bob")).toMatchObject({ status: "active", startWeightKg: 95 });
    });
  });

  describe("database constraints", () => {
    const insert = (g: Partial<NewGoal>) => createGoal(db, "alice", { ...loseGoal, ...g });

    it("rejects a loss goal without target or rate", async () => {
      await expect(insert({ targetWeightKg: null, weeklyRatePct: null })).rejects.toThrow();
    });
    it("rejects a target without a rate", async () => {
      await expect(
        insert({ type: "maintain", targetWeightKg: 80, weeklyRatePct: null }),
      ).rejects.toThrow();
    });
    it("rejects a rate outside the bounds of its type", async () => {
      await expect(insert({ type: "lose", weeklyRatePct: 1.6 })).rejects.toThrow();
      await expect(
        insert({ type: "gain", targetWeightKg: 95, weeklyRatePct: 0.8 }),
      ).rejects.toThrow();
    });
    it("rejects weights outside 20-400 kg", async () => {
      await expect(
        insert({ type: "lose", startWeightKg: 19, targetWeightKg: 15 }),
      ).rejects.toThrow();
      await expect(
        insert({ type: "gain", startWeightKg: 90, targetWeightKg: 401, weeklyRatePct: 0.25 }),
      ).rejects.toThrow();
    });
  });
});
