import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/features/profile/queries";
import { insertWeights } from "@/features/weight/queries";
import { addDays } from "@/lib/dates";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";
import * as queries from "./queries";
import { createGoal, getActiveGoal, listPastGoals } from "./queries";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: ctx.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));
vi.mock("./queries", async (importOriginal) => {
  const original = await importOriginal<typeof import("./queries")>();
  return {
    ...original,
    createGoal: vi.fn(original.createGoal),
    replaceActiveGoal: vi.fn(original.replaceActiveGoal),
  };
});

import { achieveGoalAction, saveGoalAction } from "./actions";

const form = (values: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
};
const profile = (timezone: string): Profile => ({
  userId: "alice",
  sex: "female",
  heightCm: 168,
  birthDate: "1990-04-12",
  weightUnit: "kg",
  lengthUnit: "cm",
  timezone,
  reminderWeekday: null,
  onboardingCompletedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});
const asUser = (userId: string, timezone = "Europe/Paris") =>
  ctx.requireUser.mockResolvedValue({
    userId,
    email: `${userId}@example.com`,
    emailVerified: true,
    profile: { ...profile(timezone), userId },
  });

/** 12 weighings (flat 80 kg unless `last` differs): calibrated, trend 80. */
const seedWeights = (userId: string, base = 80, last = base) =>
  insertWeights(
    ctx.db,
    userId,
    Array.from({ length: 12 }, (_, i) => ({
      date: addDays("2026-09-21", i),
      weightKg: i === 11 ? last : base,
      bodyFatPct: null,
      note: null,
    })),
  );

describe("saveGoalAction", () => {
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    ({ db: ctx.db, close } = await createTestDb());
    await insertTestUser(ctx.db, "alice");
    await insertTestUser(ctx.db, "bob");
    await seedWeights("alice");
    asUser("alice");
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await close();
  });

  it("creates a loss goal starting from the current trend, today", async () => {
    const result = await saveGoalAction(
      null,
      form({ type: "lose", target: "74,5", rate: "0,5", unit: "kg" }),
    );
    expect(result).toEqual({ ok: true });
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({
      type: "lose",
      startDate: "2026-10-03",
      startWeightKg: 80,
      targetWeightKg: 74.5,
      weeklyRatePct: 0.5,
    });
    expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("uses the latest weighing as the start while calibrating", async () => {
    asUser("bob");
    await insertWeights(ctx.db, "bob", [
      { date: "2026-10-03", weightKg: 91.3, bodyFatPct: null, note: null },
    ]);
    await saveGoalAction(null, form({ type: "maintain", unit: "kg" }));
    expect(await getActiveGoal(ctx.db, "bob")).toMatchObject({
      type: "maintain",
      startWeightKg: 91.3,
      targetWeightKg: null,
    });
  });

  it("starts from the trend, not the last weighing, once calibrated", async () => {
    asUser("bob");
    await seedWeights("bob", 80, 82); // trend 80.2, last weighing 82
    await saveGoalAction(null, form({ type: "lose", target: "75", rate: "0,5", unit: "kg" }));
    expect((await getActiveGoal(ctx.db, "bob"))?.startWeightKg).toBe(80.2);
  });

  it("starts from the last weighing during calibration, not the average", async () => {
    asUser("bob");
    await insertWeights(ctx.db, "bob", [
      { date: "2026-10-02", weightKg: 80, bodyFatPct: null, note: null },
      { date: "2026-10-03", weightKg: 82, bodyFatPct: null, note: null },
    ]);
    await saveGoalAction(null, form({ type: "lose", target: "75", rate: "0,5", unit: "kg" }));
    expect((await getActiveGoal(ctx.db, "bob"))?.startWeightKg).toBe(82);
  });

  it("compares the target with the rounded reference that gets stored", async () => {
    asUser("bob");
    await seedWeights("bob", 75, 75.04); // trend 75.004, stored as 75
    const result = await saveGoalAction(
      null,
      form({ type: "lose", target: "75", rate: "0,5", unit: "kg" }),
    );
    expect(result).toMatchObject({ ok: false, fieldErrors: { target: expect.any(Array) } });
    expect(await getActiveGoal(ctx.db, "bob")).toBeNull();
  });

  it("dates the goal in the profile's timezone, not in UTC", async () => {
    vi.setSystemTime(new Date("2026-10-04T02:30:00Z")); // still Oct 3 at 19:30 in Los Angeles
    asUser("alice", "America/Los_Angeles");
    await saveGoalAction(null, form({ type: "maintain", unit: "kg" }));
    expect((await getActiveGoal(ctx.db, "alice"))?.startDate).toBe("2026-10-03");
  });

  it("returns field errors and keeps the typed values", async () => {
    const result = await saveGoalAction(
      null,
      form({ type: "lose", target: "85", rate: "0,5", unit: "kg" }),
    );
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { target: [expect.stringContaining("inférieure")] },
      values: { target: "85", rate: "0,5" },
    });
    expect(await getActiveGoal(ctx.db, "alice")).toBeNull();
  });

  it("refuses to set a goal without any weighing", async () => {
    asUser("bob");
    const result = await saveGoalAction(null, form({ type: "maintain", unit: "kg" }));
    expect(result).toMatchObject({ ok: false, formError: expect.stringContaining("pesée") });
  });

  it("updates target and rate in place when the type is unchanged", async () => {
    await createGoal(ctx.db, "alice", {
      type: "lose",
      startDate: "2026-09-01",
      startWeightKg: 90,
      targetWeightKg: 75,
      weeklyRatePct: 0.5,
    });
    const before = await getActiveGoal(ctx.db, "alice");
    const result = await saveGoalAction(
      null,
      form({ type: "lose", target: "72", rate: "0,75", unit: "kg" }),
    );
    expect(result).toEqual({ ok: true });
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({
      id: before?.id,
      startWeightKg: 90,
      targetWeightKg: 72,
      weeklyRatePct: 0.75,
    });
    expect(await listPastGoals(ctx.db, "alice")).toHaveLength(0);
  });

  it("asks for confirmation before changing the type, and writes nothing", async () => {
    await createGoal(ctx.db, "alice", {
      type: "lose",
      startDate: "2026-09-01",
      startWeightKg: 90,
      targetWeightKg: 75,
      weeklyRatePct: 0.5,
    });
    const result = await saveGoalAction(
      null,
      form({ type: "gain", target: "85", rate: "0,25", unit: "kg" }),
    );
    expect(result).toMatchObject({
      ok: false,
      needsConfirmation: { reason: "archive", message: expect.stringContaining("archive") },
      values: { confirmed: "" },
    });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("lose");
  });

  it("archives the old goal and creates the new one once confirmed", async () => {
    await createGoal(ctx.db, "alice", {
      type: "lose",
      startDate: "2026-09-01",
      startWeightKg: 90,
      targetWeightKg: 75,
      weeklyRatePct: 0.5,
    });
    const result = await saveGoalAction(
      null,
      form({ type: "gain", target: "85", rate: "0,25", unit: "kg", confirm: "archive" }),
    );
    expect(result).toEqual({ ok: true });
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({ type: "gain", startWeightKg: 80 });
    expect(await listPastGoals(ctx.db, "alice")).toMatchObject([
      { type: "lose", status: "archived", endedAt: "2026-10-03" },
    ]);
  });

  it("is a no-op when saving the same maintain goal again", async () => {
    await saveGoalAction(null, form({ type: "maintain", unit: "kg" }));
    const before = await getActiveGoal(ctx.db, "alice");
    expect(await saveGoalAction(null, form({ type: "maintain", unit: "kg" }))).toEqual({
      ok: true,
    });
    expect((await getActiveGoal(ctx.db, "alice"))?.id).toBe(before?.id);
    expect(await listPastGoals(ctx.db, "alice")).toHaveLength(0);
  });

  it("only ever touches the caller's goals, whatever userId is forged", async () => {
    await createGoal(ctx.db, "bob", {
      type: "maintain",
      startDate: "2026-09-01",
      startWeightKg: 95,
      targetWeightKg: null,
      weeklyRatePct: null,
    });
    await saveGoalAction(
      null,
      form({ type: "lose", target: "75", rate: "0,5", unit: "kg", userId: "bob" }),
    );
    expect(await getActiveGoal(ctx.db, "bob")).toMatchObject({
      type: "maintain",
      startWeightKg: 95,
    });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("lose");
  });

  it("returns a clean error on a concurrent create (unique violation), without health data", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const original = vi.mocked(queries.createGoal).getMockImplementation();
    vi.mocked(queries.createGoal).mockImplementationOnce(async (db, userId, g) => {
      await original?.(db, userId, g); // the other tab won the race
      return original?.(db, userId, g);
    });
    const result = await saveGoalAction(
      null,
      form({ type: "lose", target: "74,5", rate: "0,5", unit: "kg" }),
    );
    expect(result).toMatchObject({ ok: false, formError: expect.stringContaining("Recharge") });
    expect(log).toHaveBeenCalledWith("save_goal_failed", { userId: "alice", code: "23505" });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/74|80/);
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({ type: "lose" });
    log.mockRestore();
  });

  it("returns a clean error on a CHECK violation", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(queries.createGoal).mockImplementationOnce(async (db, userId, g) =>
      vi.mocked(queries.createGoal).getMockImplementation()?.(db, userId, {
        ...g,
        weeklyRatePct: null,
      }),
    );
    const result = await saveGoalAction(
      null,
      form({ type: "lose", target: "74,5", rate: "0,5", unit: "kg" }),
    );
    expect(result).toMatchObject({ ok: false, formError: expect.any(String) });
    expect(log).toHaveBeenCalledWith("save_goal_failed", { userId: "alice", code: "23514" });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/74|80/);
    log.mockRestore();
  });

  it("never updates a maintain goal's target in place", async () => {
    await saveGoalAction(null, form({ type: "maintain", unit: "kg" }));
    const result = await saveGoalAction(
      null,
      form({ type: "maintain", target: "70", rate: "0,5", unit: "kg" }),
    );
    expect(result).toEqual({ ok: true });
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({
      type: "maintain",
      targetWeightKg: null,
      weeklyRatePct: null,
    });
  });

  it("asks for confirmation when switching from maintain to a loss goal", async () => {
    await saveGoalAction(null, form({ type: "maintain", unit: "kg" }));
    const result = await saveGoalAction(
      null,
      form({ type: "lose", target: "75", rate: "0,5", unit: "kg" }),
    );
    expect(result).toMatchObject({ ok: false, needsConfirmation: { reason: "archive" } });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("maintain");
  });

  it("rejects non-finite input and writes nothing", async () => {
    for (const target of ["1e400", "Infinity", "NaN", ""]) {
      const result = await saveGoalAction(
        null,
        form({ type: "lose", target, rate: "0,5", unit: "kg" }),
      );
      expect(result, target).toMatchObject({
        ok: false,
        fieldErrors: { target: expect.any(Array) },
      });
    }
    for (const rate of ["1e400", "Infinity", ""]) {
      const result = await saveGoalAction(
        null,
        form({ type: "lose", target: "75", rate, unit: "kg" }),
      );
      expect(result, rate).toMatchObject({ ok: false, fieldErrors: { rate: expect.any(Array) } });
    }
    expect(await getActiveGoal(ctx.db, "alice")).toBeNull();
  });
});

describe("achieveGoalAction", () => {
  let close: () => Promise<void>;
  const lose = (targetWeightKg: number) => ({
    type: "lose" as const,
    startDate: "2026-09-01",
    startWeightKg: 90,
    targetWeightKg,
    weeklyRatePct: 0.5,
  });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    ({ db: ctx.db, close } = await createTestDb());
    await insertTestUser(ctx.db, "alice");
    await insertTestUser(ctx.db, "bob");
    await seedWeights("alice"); // trend 80
    asUser("alice");
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await close();
  });

  it("refuses when the goal is not reached, and changes nothing", async () => {
    await createGoal(ctx.db, "alice", lose(75)); // trend 80 > target 75
    const result = await achieveGoalAction(null, form({ mode: "maintain" }));
    expect(result).toMatchObject({ ok: false, formError: expect.any(String) });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("lose");
    expect(await listPastGoals(ctx.db, "alice")).toHaveLength(0);
  });

  it("refuses on a maintain goal and on an unachieved gain goal", async () => {
    await createGoal(ctx.db, "alice", {
      ...lose(82),
      type: "maintain",
      targetWeightKg: null,
      weeklyRatePct: null,
    });
    expect(await achieveGoalAction(null, form({ mode: "maintain" }))).toMatchObject({ ok: false });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("maintain");
    await queries.finishActiveGoal(ctx.db, "alice", "archived", "2026-10-02");
    await createGoal(ctx.db, "alice", { ...lose(85), type: "gain", startWeightKg: 70 });
    expect(await achieveGoalAction(null, form({ mode: "maintain" }))).toMatchObject({ ok: false });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("gain");
  });

  it("does not touch a newer goal when the checked one was closed meanwhile", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await createGoal(ctx.db, "alice", lose(82));
    // Another tab closes L and saves a fresh gain goal G between the check and the write.
    const realReplace = vi.mocked(queries.replaceActiveGoal).getMockImplementation();
    vi.mocked(queries.replaceActiveGoal).mockImplementationOnce(async (...args) => {
      await queries.finishActiveGoal(ctx.db, "alice", "achieved", "2026-10-02");
      await createGoal(ctx.db, "alice", { ...lose(95), type: "gain", startWeightKg: 70 });
      return realReplace?.(...args);
    });
    const result = await achieveGoalAction(null, form({ mode: "maintain" }));
    expect(result).toMatchObject({ ok: false, formError: expect.stringContaining("Recharge") });
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({ type: "gain", status: "active" });
    expect(await listPastGoals(ctx.db, "alice")).toHaveLength(1);
    expect(log).toHaveBeenCalledWith("achieve_goal_failed", { userId: "alice", code: undefined });
    log.mockRestore();
  });

  it("refuses when there is no active goal", async () => {
    expect(await achieveGoalAction(null, form({ mode: "maintain" }))).toMatchObject({ ok: false });
  });

  it("moves to maintenance: the old goal is achieved, the new reference is today's trend", async () => {
    await createGoal(ctx.db, "alice", lose(82)); // trend 80 ≤ target 82
    expect(await achieveGoalAction(null, form({ mode: "maintain" }))).toEqual({ ok: true });
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({
      type: "maintain",
      startDate: "2026-10-03",
      startWeightKg: 80,
      targetWeightKg: null,
    });
    expect(await listPastGoals(ctx.db, "alice")).toMatchObject([
      { type: "lose", status: "achieved", endedAt: "2026-10-03" },
    ]);
    expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("'new' marks the goal achieved and sends the user to /objectif", async () => {
    await createGoal(ctx.db, "alice", lose(82));
    await expect(achieveGoalAction(null, form({ mode: "new" }))).rejects.toThrow(
      "REDIRECT:/objectif",
    );
    expect(await getActiveGoal(ctx.db, "alice")).toBeNull();
    expect((await listPastGoals(ctx.db, "alice"))[0].status).toBe("achieved");
  });

  it("dates the end in the profile's timezone", async () => {
    vi.setSystemTime(new Date("2026-10-04T02:30:00Z"));
    asUser("alice", "America/Los_Angeles");
    await createGoal(ctx.db, "alice", lose(82));
    await achieveGoalAction(null, form({ mode: "maintain" }));
    expect((await listPastGoals(ctx.db, "alice"))[0].endedAt).toBe("2026-10-03");
  });

  it("rejects an unknown mode", async () => {
    await createGoal(ctx.db, "alice", lose(82));
    expect(await achieveGoalAction(null, form({ mode: "delete" }))).toMatchObject({ ok: false });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("lose");
  });

  it("never closes another user's goal", async () => {
    await createGoal(ctx.db, "bob", lose(82));
    await achieveGoalAction(null, form({ mode: "maintain", userId: "bob" }));
    expect(await getActiveGoal(ctx.db, "bob")).toMatchObject({ type: "lose", status: "active" });
  });
});
