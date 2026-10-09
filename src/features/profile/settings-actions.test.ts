import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/types";
import { listWeights, upsertWeight } from "@/features/weight/queries";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";
import { getProfile, saveBodyInfo, saveSex, type Profile } from "./queries";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: ctx.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));

import {
  saveProfileSettingsAction,
  saveReminderWeekdayAction,
  saveUnitsAction,
} from "./settings-actions";

const form = (values: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
};
const profile: Profile = {
  userId: "alice",
  sex: "female",
  heightCm: 168,
  birthDate: "1990-04-12",
  weightUnit: "kg",
  lengthUnit: "cm",
  timezone: "Europe/Paris",
  reminderWeekday: null,
  onboardingCompletedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("settings actions", () => {
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    ({ db: ctx.db, close } = await createTestDb());
    for (const id of ["alice", "bob"]) {
      await insertTestUser(ctx.db, id);
      await saveSex(ctx.db, id, "female", "Europe/Paris");
      await saveBodyInfo(ctx.db, id, { heightCm: 168, birthDate: "1990-04-12", lengthUnit: "cm" });
    }
    ctx.requireUser.mockResolvedValue({ userId: "alice", email: "a@b.c", profile });
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await close();
  });

  describe("saveProfileSettingsAction", () => {
    it("saves sex, height and birth date, keeps the weighings and refreshes the app", async () => {
      await upsertWeight(ctx.db, "alice", {
        date: "2026-10-01",
        weightKg: 80,
        bodyFatPct: null,
        note: null,
      });

      const result = await saveProfileSettingsAction(
        null,
        form({ sex: "male", height: "172,5", birthDate: "1991-05-02" }),
      );

      expect(result).toEqual({ ok: true });
      expect(await getProfile(ctx.db, "alice")).toMatchObject({
        sex: "male",
        heightCm: 172.5,
        birthDate: "1991-05-02",
      });
      expect(await listWeights(ctx.db, "alice")).toHaveLength(1);
      expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(await getProfile(ctx.db, "bob")).toMatchObject({
        sex: "female",
        heightCm: 168,
        birthDate: "1990-04-12",
      });
    });

    it("reads the height in inches when the profile displays inches", async () => {
      ctx.requireUser.mockResolvedValue({
        userId: "alice",
        email: "a@b.c",
        profile: { ...profile, lengthUnit: "in" },
      });

      await saveProfileSettingsAction(
        null,
        form({ sex: "female", height: "66", birthDate: "1990-04-12" }),
      );

      expect((await getProfile(ctx.db, "alice"))?.heightCm).toBe(167.6);
    });

    it.each([
      ["a height out of range", { sex: "female", height: "99", birthDate: "1990-04-12" }, "height"],
      ["a non-numeric height", { sex: "female", height: "abc", birthDate: "1990-04-12" }, "height"],
      ["a user under 16", { sex: "female", height: "168", birthDate: "2015-01-01" }, "birthDate"],
      ["an unknown sex", { sex: "other", height: "168", birthDate: "1990-04-12" }, "sex"],
    ])("refuses %s and writes nothing", async (_, input, field) => {
      const result = await saveProfileSettingsAction(null, form(input));

      expect(result).toMatchObject({ ok: false, fieldErrors: { [field]: [expect.any(String)] } });
      expect(await getProfile(ctx.db, "alice")).toMatchObject({ sex: "female", heightCm: 168 });
      expect(ctx.revalidatePath).not.toHaveBeenCalled();
    });

    it("reports a sex error and a height error together, without a partial write", async () => {
      const result = await saveProfileSettingsAction(
        null,
        form({ sex: "other", height: "99", birthDate: "1990-04-12" }),
      );

      expect(result).toMatchObject({
        ok: false,
        fieldErrors: { sex: [expect.any(String)], height: [expect.any(String)] },
      });
      expect((await getProfile(ctx.db, "alice"))?.sex).toBe("female");
    });

    it("sends a user without a profile to the onboarding", async () => {
      ctx.requireUser.mockResolvedValue({ userId: "alice", email: "a@b.c", profile: null });
      await expect(
        saveProfileSettingsAction(
          null,
          form({ sex: "male", height: "170", birthDate: "1990-04-12" }),
        ),
      ).rejects.toThrow("redirect:/onboarding");
    });
  });

  describe("saveUnitsAction", () => {
    it("saves both units for the session user only", async () => {
      const result = await saveUnitsAction(null, form({ weightUnit: "lb", lengthUnit: "in" }));

      expect(result).toEqual({ ok: true });
      expect(await getProfile(ctx.db, "alice")).toMatchObject({
        weightUnit: "lb",
        lengthUnit: "in",
      });
      expect(await getProfile(ctx.db, "bob")).toMatchObject({ weightUnit: "kg", lengthUnit: "cm" });
      expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("does not touch any stored weight or height", async () => {
      await upsertWeight(ctx.db, "alice", {
        date: "2026-10-01",
        weightKg: 78.4,
        bodyFatPct: null,
        note: null,
      });
      await saveUnitsAction(null, form({ weightUnit: "lb", lengthUnit: "in" }));
      await saveUnitsAction(null, form({ weightUnit: "kg", lengthUnit: "cm" }));

      expect((await listWeights(ctx.db, "alice"))[0].weightKg).toBe(78.4);
      expect((await getProfile(ctx.db, "alice"))?.heightCm).toBe(168);
    });

    it("refuses an unknown unit and writes nothing", async () => {
      const result = await saveUnitsAction(null, form({ weightUnit: "stone", lengthUnit: "cm" }));

      expect(result).toMatchObject({ ok: false, formError: expect.any(String) });
      expect((await getProfile(ctx.db, "alice"))?.weightUnit).toBe("kg");
    });
  });

  describe("saveReminderWeekdayAction", () => {
    it("sets the day, then clears it with 'none'", async () => {
      expect(await saveReminderWeekdayAction(null, form({ weekday: "2" }))).toEqual({ ok: true });
      expect((await getProfile(ctx.db, "alice"))?.reminderWeekday).toBe(2);

      expect(await saveReminderWeekdayAction(null, form({ weekday: "none" }))).toEqual({
        ok: true,
      });
      expect((await getProfile(ctx.db, "alice"))?.reminderWeekday).toBeNull();
    });

    it.each(["7", "", "abc"])("refuses %j and keeps the current day", async (weekday) => {
      await saveReminderWeekdayAction(null, form({ weekday: "3" }));

      const result = await saveReminderWeekdayAction(null, form({ weekday }));

      expect(result).toMatchObject({ ok: false });
      expect((await getProfile(ctx.db, "alice"))?.reminderWeekday).toBe(3);
    });

    it("never writes another user's profile", async () => {
      await saveReminderWeekdayAction(null, form({ weekday: "4" }));
      expect((await getProfile(ctx.db, "bob"))?.reminderWeekday).toBeNull();
    });
  });
});
