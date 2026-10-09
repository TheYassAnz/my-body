import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as goalQueries from "@/features/goals/queries";
import { createGoal, getActiveGoal } from "@/features/goals/queries";
import { upsertWeight } from "@/features/weight/queries";
import { goal, profile, weightEntry } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));
vi.mock("@/features/goals/queries", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/goals/queries")>();
  return { ...original, createGoal: vi.fn(original.createGoal) };
});

import {
  finishOnboardingAction,
  saveBodyAction,
  saveFirstWeightAction,
  saveGoalStepAction,
  saveSexAction,
} from "./actions";

const form = (values: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
};
const BODY = { height: "170", lengthUnit: "cm", birthDate: "1990-04-12" };

describe("profile server actions", () => {
  let close: () => Promise<void>;

  const row = async (id: string) =>
    (await ctx.db.select().from(profile).where(eq(profile.userId, id)))[0] ?? null;
  const asAlice = async (withProfile: boolean) => {
    ctx.requireUser.mockResolvedValue({
      userId: "alice",
      email: "alice@example.com",
      emailVerified: true,
      profile: withProfile ? await row("alice") : null,
    });
  };

  beforeEach(async () => {
    ({ db: ctx.db, close } = await createTestDb());
    await insertTestUser(ctx.db, "alice");
    await insertTestUser(ctx.db, "bob");
  });
  afterEach(async () => {
    vi.clearAllMocks();
    await close();
  });

  describe("saveSexAction", () => {
    it("creates the profile for the current user and goes on", async () => {
      await asAlice(false);
      await expect(
        saveSexAction(null, form({ sex: "female", timezone: "Europe/Paris" })),
      ).rejects.toThrow("REDIRECT /onboarding");
      expect(ctx.requireUser).toHaveBeenCalledWith("onboarding");
      expect(await row("alice")).toMatchObject({ sex: "female", timezone: "Europe/Paris" });
    });

    it("returns a field error without a silhouette", async () => {
      await asAlice(false);
      const r = await saveSexAction(null, form({ timezone: "Europe/Paris" }));
      expect(r).toMatchObject({ ok: false, fieldErrors: { sex: expect.any(Array) } });
      expect(await row("alice")).toBeNull();
    });

    it("ignores a forged userId field", async () => {
      await asAlice(false);
      await ctx.db.insert(profile).values({ userId: "bob", sex: "male", timezone: "Europe/Paris" });
      const before = await row("bob");
      await expect(
        saveSexAction(null, form({ sex: "female", timezone: "Europe/Paris", userId: "bob" })),
      ).rejects.toThrow("REDIRECT");
      expect(await row("bob")).toEqual(before);
      expect(await row("alice")).toMatchObject({ sex: "female" });
    });
  });

  describe("saveBodyAction", () => {
    beforeEach(async () => {
      await ctx.db
        .insert(profile)
        .values({ userId: "alice", sex: "female", timezone: "Europe/Paris" });
      await asAlice(true);
    });

    it("saves the body info and moves on to the weight step", async () => {
      await expect(saveBodyAction(null, form(BODY))).rejects.toThrow("REDIRECT /onboarding");
      expect(await row("alice")).toMatchObject({
        heightCm: 170,
        birthDate: "1990-04-12",
        lengthUnit: "cm",
        onboardingCompletedAt: null,
      });
    });

    it("goes on to the goal step when the weight exists but not the goal (user went back)", async () => {
      await upsertWeight(ctx.db, "alice", {
        date: "2026-10-01",
        weightKg: 70,
        bodyFatPct: null,
        note: null,
      });
      await expect(saveBodyAction(null, form(BODY))).rejects.toThrow("REDIRECT /onboarding");
      expect((await row("alice"))?.onboardingCompletedAt).toBeNull();
    });

    it("goes to the first session step when weight and goal already exist", async () => {
      await upsertWeight(ctx.db, "alice", {
        date: "2026-10-01",
        weightKg: 70,
        bodyFatPct: null,
        note: null,
      });
      await createGoal(ctx.db, "alice", {
        type: "maintain",
        startDate: "2026-10-01",
        startWeightKg: 70,
        targetWeightKg: null,
        weeklyRatePct: null,
      });
      await expect(saveBodyAction(null, form(BODY))).rejects.toThrow("REDIRECT /onboarding");
      expect((await row("alice"))?.onboardingCompletedAt).toBeNull();
    });

    it("refuses an invalid height and changes nothing", async () => {
      const before = await row("alice");
      const r = await saveBodyAction(null, form({ ...BODY, height: "99" }));
      expect(r).toMatchObject({ ok: false, fieldErrors: { height: expect.any(Array) } });
      expect(await row("alice")).toEqual(before);
    });

    it("refuses an under-16 birth date and changes nothing", async () => {
      const before = await row("alice");
      const r = await saveBodyAction(null, form({ ...BODY, birthDate: "2999-01-01" }));
      expect(r).toMatchObject({ ok: false, fieldErrors: { birthDate: expect.any(Array) } });
      expect(await row("alice")).toEqual(before);
    });

    it("ignores a forged userId field", async () => {
      await ctx.db.insert(profile).values({ userId: "bob", sex: "male", timezone: "Europe/Paris" });
      const before = await row("bob");
      await expect(saveBodyAction(null, form({ ...BODY, userId: "bob" }))).rejects.toThrow(
        "REDIRECT /onboarding",
      );
      expect(await row("bob")).toEqual(before);
      expect(await row("alice")).toMatchObject({ heightCm: 170 });
    });

    it("sends users without a profile row back to step 1 and writes nothing", async () => {
      await ctx.db.delete(profile).where(eq(profile.userId, "alice"));
      await asAlice(false);
      await expect(saveBodyAction(null, form(BODY))).rejects.toThrow("REDIRECT /onboarding");
      expect(await ctx.db.select().from(profile)).toHaveLength(0);
    });
  });

  describe("saveFirstWeightAction", () => {
    const weights = () => ctx.db.select().from(weightEntry);

    beforeEach(async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
      await ctx.db.insert(profile).values({
        userId: "alice",
        sex: "female",
        timezone: "Europe/Paris",
        heightCm: 168,
        birthDate: "1990-04-12",
      });
      await asAlice(true);
    });
    afterEach(() => vi.useRealTimers());

    it("creates today's weighing, saves the unit and moves on to the goal step", async () => {
      await expect(
        saveFirstWeightAction(null, form({ weight: "172", unit: "lb", date: "2020-01-01" })),
      ).rejects.toThrow("REDIRECT /onboarding");
      expect(await weights()).toMatchObject([
        { userId: "alice", date: "2026-10-03", weightKg: 78.02 },
      ]);
      expect(await row("alice")).toMatchObject({
        weightUnit: "lb",
        onboardingCompletedAt: null,
      });
    });

    it("refuses an invalid weight and writes nothing", async () => {
      const r = await saveFirstWeightAction(null, form({ weight: "19,9", unit: "kg" }));
      expect(r).toMatchObject({
        ok: false,
        fieldErrors: { weight: expect.any(Array) },
        values: { weight: "19,9", unit: "kg" },
      });
      expect(await weights()).toHaveLength(0);
      expect((await row("alice"))?.weightUnit).toBe("kg");
    });

    it("replaces the weighing when the step is saved again the same day", async () => {
      await expect(
        saveFirstWeightAction(null, form({ weight: "70", unit: "kg" })),
      ).rejects.toThrow();
      await expect(
        saveFirstWeightAction(null, form({ weight: "71", unit: "kg" })),
      ).rejects.toThrow();
      expect(await weights()).toMatchObject([{ weightKg: 71 }]);
    });

    it("ignores a forged userId field", async () => {
      await expect(
        saveFirstWeightAction(null, form({ weight: "70", unit: "kg", userId: "bob" })),
      ).rejects.toThrow("REDIRECT /onboarding");
      expect(await weights()).toMatchObject([{ userId: "alice" }]);
    });

    it("sends users without a profile row back to step 1 and writes nothing", async () => {
      await asAlice(false);
      await expect(saveFirstWeightAction(null, form({ weight: "70", unit: "kg" }))).rejects.toThrow(
        "REDIRECT /onboarding",
      );
      expect(await weights()).toHaveLength(0);
    });
  });

  describe("saveGoalStepAction", () => {
    beforeEach(async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
      await ctx.db.insert(profile).values({
        userId: "alice",
        sex: "female",
        timezone: "Europe/Paris",
        heightCm: 168,
        birthDate: "1990-04-12",
      });
      await upsertWeight(ctx.db, "alice", {
        date: "2026-10-03",
        weightKg: 78.2,
        bodyFatPct: null,
        note: null,
      });
      await asAlice(true);
    });
    afterEach(() => vi.useRealTimers());

    it("'Juste suivre mon poids' creates a maintenance goal and moves on to the first session step", async () => {
      await expect(
        saveGoalStepAction(null, form({ type: "maintain", unit: "kg" })),
      ).rejects.toThrow("REDIRECT /onboarding");
      expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({
        type: "maintain",
        startWeightKg: 78.2,
      });
      expect((await row("alice"))?.onboardingCompletedAt).toBeNull();
    });

    it("a loss goal starts at the weight typed at step 3", async () => {
      await expect(
        saveGoalStepAction(null, form({ type: "lose", target: "70", rate: "0,5", unit: "kg" })),
      ).rejects.toThrow("REDIRECT /onboarding");
      expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({
        type: "lose",
        startWeightKg: 78.2,
        targetWeightKg: 70,
        startDate: "2026-10-03",
      });
    });

    it("rejects a target above the current weight and creates nothing", async () => {
      const r = await saveGoalStepAction(
        null,
        form({ type: "lose", target: "80", rate: "0,5", unit: "kg" }),
      );
      expect(r).toMatchObject({ ok: false, fieldErrors: { target: expect.any(Array) } });
      expect(await getActiveGoal(ctx.db, "alice")).toBeNull();
      expect((await row("alice"))?.onboardingCompletedAt).toBeNull();
    });

    it("a second submission does not create a second goal", async () => {
      await expect(
        saveGoalStepAction(null, form({ type: "maintain", unit: "kg" })),
      ).rejects.toThrow("REDIRECT");
      await expect(
        saveGoalStepAction(null, form({ type: "lose", target: "70", rate: "0,5", unit: "kg" })),
      ).rejects.toThrow("REDIRECT");
      expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("maintain");
    });

    it("sends users without a weighing back to the start and creates nothing", async () => {
      await ctx.db.delete(weightEntry);
      await expect(
        saveGoalStepAction(null, form({ type: "maintain", unit: "kg" })),
      ).rejects.toThrow("REDIRECT /onboarding");
      expect(await getActiveGoal(ctx.db, "alice")).toBeNull();
    });

    it("ignores a forged userId field", async () => {
      await expect(
        saveGoalStepAction(null, form({ type: "maintain", unit: "kg", userId: "bob" })),
      ).rejects.toThrow("REDIRECT /onboarding");
      expect(await getActiveGoal(ctx.db, "bob")).toBeNull();
      expect(await getActiveGoal(ctx.db, "alice")).not.toBeNull();
    });

    it("treats a concurrent unique violation (23505, nested in cause) as already created", async () => {
      const real = vi.mocked(goalQueries.createGoal).getMockImplementation();
      vi.mocked(goalQueries.createGoal).mockImplementationOnce(async (db, userId, g) => {
        // The other submit wins the race, then ours hits the unique index.
        await real?.(db, userId, g);
        throw new Error("Failed query", {
          cause: Object.assign(new Error("dup"), { code: "23505" }),
        });
      });
      await expect(
        saveGoalStepAction(null, form({ type: "maintain", unit: "kg" })),
      ).rejects.toThrow("REDIRECT /onboarding");
      expect((await row("alice"))?.onboardingCompletedAt).toBeNull();
    });

    it("returns a clean form error on another DB failure and logs no health data", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(goalQueries.createGoal).mockRejectedValueOnce(
        Object.assign(new Error("params: alice,78.2,70,0.5"), { code: "XX000" }),
      );
      const r = await saveGoalStepAction(
        null,
        form({ type: "lose", target: "70", rate: "0,5", unit: "kg" }),
      );
      expect(r).toMatchObject({ ok: false, formError: expect.any(String) });
      expect((await row("alice"))?.onboardingCompletedAt).toBeNull();
      const logged = JSON.stringify(spy.mock.calls);
      expect(logged).toContain("XX000");
      expect(logged).not.toMatch(/78\.2|70|0\.5/);
      spy.mockRestore();
    });
  });

  describe("finishOnboardingAction (step 5)", () => {
    beforeEach(async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
      await ctx.db.insert(profile).values({
        userId: "alice",
        sex: "female",
        timezone: "Europe/Paris",
        heightCm: 168,
        birthDate: "1990-04-12",
      });
      await upsertWeight(ctx.db, "alice", {
        date: "2026-10-03",
        weightKg: 78.2,
        bodyFatPct: null,
        note: null,
      });
      await createGoal(ctx.db, "alice", {
        type: "maintain",
        startDate: "2026-10-03",
        startWeightKg: 78.2,
        targetWeightKg: null,
        weeklyRatePct: null,
      });
      await asAlice(true);
    });
    afterEach(() => vi.useRealTimers());

    it("'Plus tard' completes the onboarding and opens the Accueil", async () => {
      await expect(finishOnboardingAction(null, form({ next: "later" }))).rejects.toThrow(
        "REDIRECT /accueil",
      );
      expect((await row("alice"))?.onboardingCompletedAt).toBeInstanceOf(Date);
    });

    it("'Commencer' completes the onboarding and opens the guided session", async () => {
      await expect(finishOnboardingAction(null, form({ next: "start" }))).rejects.toThrow(
        "REDIRECT /corps/seance",
      );
      expect((await row("alice"))?.onboardingCompletedAt).toBeInstanceOf(Date);
    });

    it("treats an unknown destination as 'later'", async () => {
      await expect(finishOnboardingAction(null, form({ next: "//evil.example" }))).rejects.toThrow(
        "REDIRECT /accueil",
      );
    });

    it("does not complete the onboarding without an active goal", async () => {
      await ctx.db.delete(goal);
      await expect(finishOnboardingAction(null, form({ next: "later" }))).rejects.toThrow(
        "REDIRECT /onboarding",
      );
      expect((await row("alice"))?.onboardingCompletedAt).toBeNull();
    });

    it("does not complete the onboarding without a weighing", async () => {
      await ctx.db.delete(weightEntry);
      await expect(finishOnboardingAction(null, form({ next: "start" }))).rejects.toThrow(
        "REDIRECT /onboarding",
      );
      expect((await row("alice"))?.onboardingCompletedAt).toBeNull();
    });
  });
});
