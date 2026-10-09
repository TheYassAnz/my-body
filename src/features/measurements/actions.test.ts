import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/features/profile/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";
import { getMeasureOn, listMeasures, upsertMeasure } from "./queries";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: ctx.revalidatePath }));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));

import { saveSessionZoneAction, saveZoneAction } from "./actions";

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
const asAlice = (timezone = "Europe/Paris") =>
  ctx.requireUser.mockResolvedValue({
    userId: "alice",
    email: "alice@example.com",
    emailVerified: true,
    profile: profile(timezone),
  });
const ENTRY = { date: "2026-10-03", zone: "waist", value: "84,5", unit: "cm" };

describe("measure actions", () => {
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    ({ db: ctx.db, close } = await createTestDb());
    await insertTestUser(ctx.db, "alice");
    await insertTestUser(ctx.db, "bob");
    asAlice();
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await close();
  });

  describe("saveZoneAction (zone sheet)", () => {
    it("saves a measure for the current user and refreshes every screen", async () => {
      expect(await saveZoneAction(null, form(ENTRY))).toEqual({ ok: true });
      expect(ctx.requireUser).toHaveBeenCalledWith("app");
      expect(await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist")).toMatchObject({
        valueCm: 84.5,
      });
      expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("converts inches to centimetres", async () => {
      await saveZoneAction(null, form({ ...ENTRY, value: "33,3", unit: "in" }));
      expect((await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist"))?.valueCm).toBe(84.6);
    });

    it("rejects out-of-range values and writes nothing", async () => {
      for (const value of ["9,9", "250,1", "abc", ""]) {
        const r = await saveZoneAction(null, form({ ...ENTRY, value }));
        expect(r).toMatchObject({
          ok: false,
          fieldErrors: { value: expect.any(Array) },
          values: { value },
        });
      }
      expect(await listMeasures(ctx.db, "alice")).toHaveLength(0);
      expect(ctx.revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects a future date and an unknown zone", async () => {
      expect(await saveZoneAction(null, form({ ...ENTRY, date: "2026-10-04" }))).toMatchObject({
        ok: false,
        fieldErrors: { date: expect.any(Array) },
      });
      expect(await saveZoneAction(null, form({ ...ENTRY, zone: "ankle" }))).toMatchObject({
        ok: false,
        fieldErrors: { zone: expect.any(Array) },
      });
      expect(await listMeasures(ctx.db, "alice")).toHaveLength(0);
    });

    it("asks before replacing the zone of that date, then replaces with the confirmation", async () => {
      await upsertMeasure(ctx.db, "alice", { date: "2026-10-03", zone: "waist", valueCm: 84.5 });
      const ask = await saveZoneAction(null, form({ ...ENTRY, value: "83,9" }));
      expect(ask).toMatchObject({
        ok: false,
        needsConfirmation: { reason: "replace" },
        values: { value: "83,9", confirmed: "" },
      });
      expect(ask.ok === false && ask.needsConfirmation?.message).toMatch(
        /Remplacer 84,5.cm par 83,9.cm \?/,
      );
      expect((await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist"))?.valueCm).toBe(84.5);

      expect(
        await saveZoneAction(null, form({ ...ENTRY, value: "83,9", confirm: "replace" })),
      ).toEqual({ ok: true });
      expect((await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist"))?.valueCm).toBe(83.9);
    });

    it("does not ask when the zone is empty on that date", async () => {
      await upsertMeasure(ctx.db, "alice", { date: "2026-09-26", zone: "waist", valueCm: 85 });
      expect(await saveZoneAction(null, form(ENTRY))).toEqual({ ok: true });
    });

    it("ignores any user id sent by the client", async () => {
      await saveZoneAction(null, form({ ...ENTRY, userId: "bob" }));
      expect(await listMeasures(ctx.db, "bob")).toHaveLength(0);
      expect(await listMeasures(ctx.db, "alice")).toHaveLength(1);
    });

    it("never touches another user's measure of the same date and zone", async () => {
      await upsertMeasure(ctx.db, "bob", { date: "2026-10-03", zone: "waist", valueCm: 99 });
      expect(await saveZoneAction(null, form(ENTRY))).toEqual({ ok: true }); // no confirmation: Bob's is not hers
      expect((await getMeasureOn(ctx.db, "bob", "2026-10-03", "waist"))?.valueCm).toBe(99);
      expect((await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist"))?.valueCm).toBe(84.5);
    });

    it("reports a failure without logging the measure", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      ctx.requireUser.mockResolvedValueOnce({
        userId: "ghost", // no such user: the foreign key fails
        email: "g@example.com",
        emailVerified: true,
        profile: profile("Europe/Paris"),
      });
      const r = await saveZoneAction(null, form(ENTRY));
      expect(r).toMatchObject({
        ok: false,
        formError: expect.any(String),
        values: { value: "84,5" },
      });
      expect(JSON.stringify(spy.mock.calls)).not.toContain("84");
      spy.mockRestore();
    });
  });

  describe("saveSessionZoneAction (guided session)", () => {
    it("is always dated today in the user's timezone, whatever the client sends", async () => {
      asAlice("America/Los_Angeles");
      vi.setSystemTime(new Date("2026-10-04T02:00:00Z")); // 19:00 on 2026-10-03 in Los Angeles
      await saveSessionZoneAction(null, form({ ...ENTRY, date: "2020-01-01" }));
      expect(await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist")).toMatchObject({
        valueCm: 84.5,
      });
      expect(await listMeasures(ctx.db, "alice")).toHaveLength(1);
    });

    it("re-edits the zone of its own session without asking", async () => {
      await saveSessionZoneAction(null, form(ENTRY));
      expect(await saveSessionZoneAction(null, form({ ...ENTRY, value: "83,9" }))).toEqual({
        ok: true,
      });
      const rows = await listMeasures(ctx.db, "alice");
      expect(rows).toHaveLength(1);
      expect(rows[0].valueCm).toBe(83.9);
    });

    it("rejects an invalid value", async () => {
      expect(await saveSessionZoneAction(null, form({ ...ENTRY, value: "5" }))).toMatchObject({
        ok: false,
        fieldErrors: { value: expect.any(Array) },
      });
    });
  });
});
