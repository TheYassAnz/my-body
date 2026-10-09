import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMeasureOn, listMeasures, upsertMeasure } from "@/features/measurements/queries";
import type { Profile } from "@/features/profile/queries";
import { getWeightOn, listWeights, upsertWeight } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: ctx.revalidatePath }));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));

import {
  deleteMeasureAction,
  deleteWeightAction,
  restoreMeasureAction,
  restoreWeightAction,
  updateMeasureAction,
  updateWeightAction,
} from "./actions";

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
const w = (date: string, weightKg: number) => ({ date, weightKg, bodyFatPct: null, note: null });
const EDIT = { originalDate: "2026-10-01", date: "2026-10-01", weight: "78,4", unit: "kg" };
const MEDIT = { originalDate: "2026-10-01", zone: "waist", value: "85", unit: "cm" };

describe("progress actions", () => {
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    ({ db: ctx.db, close } = await createTestDb());
    await insertTestUser(ctx.db, "alice");
    await insertTestUser(ctx.db, "bob");
    ctx.requireUser.mockResolvedValue({ userId: "alice", email: "a@b.c", profile });
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await close();
  });

  describe("updateWeightAction", () => {
    it("edits the value, refreshes every screen and takes the user from the session", async () => {
      await upsertWeight(ctx.db, "alice", w("2026-10-01", 80));
      await upsertWeight(ctx.db, "bob", w("2026-10-01", 95));
      expect(await updateWeightAction(null, form({ ...EDIT, userId: "bob" }))).toEqual({
        ok: true,
      });
      expect(ctx.requireUser).toHaveBeenCalledWith("app");
      expect((await getWeightOn(ctx.db, "alice", "2026-10-01"))?.weightKg).toBe(78.4);
      expect((await getWeightOn(ctx.db, "bob", "2026-10-01"))?.weightKg).toBe(95);
      expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("rejects out-of-range values and future dates", async () => {
      await upsertWeight(ctx.db, "alice", w("2026-10-01", 80));
      expect(await updateWeightAction(null, form({ ...EDIT, weight: "19" }))).toMatchObject({
        ok: false,
        fieldErrors: { weight: expect.any(Array) },
      });
      expect(await updateWeightAction(null, form({ ...EDIT, date: "2026-10-05" }))).toMatchObject({
        ok: false,
        fieldErrors: { date: expect.any(Array) },
      });
      expect((await getWeightOn(ctx.db, "alice", "2026-10-01"))?.weightKg).toBe(80);
      expect(ctx.revalidatePath).not.toHaveBeenCalled();
    });

    it("asks before replacing a taken date, then merges after confirmation", async () => {
      await upsertWeight(ctx.db, "alice", w("2026-10-01", 80));
      await upsertWeight(ctx.db, "alice", w("2026-09-30", 79));
      const moved = { ...EDIT, date: "2026-09-30" };
      expect(await updateWeightAction(null, form(moved))).toMatchObject({
        ok: false,
        needsConfirmation: { reason: "replace" },
      });
      expect(await listWeights(ctx.db, "alice")).toHaveLength(2);

      expect(await updateWeightAction(null, form({ ...moved, confirm: "replace" }))).toEqual({
        ok: true,
      });
      const rows = await listWeights(ctx.db, "alice");
      expect(rows.map((r) => [r.date, r.weightKg])).toEqual([["2026-09-30", 78.4]]);
    });

    it("does not ask to replace when the date is unchanged", async () => {
      await upsertWeight(ctx.db, "alice", w("2026-10-01", 80));
      expect(await updateWeightAction(null, form(EDIT))).toEqual({ ok: true });
    });

    it("asks about a suspicious value, ignoring the edited row", async () => {
      for (const d of ["2026-09-28", "2026-09-29", "2026-09-30"]) {
        await upsertWeight(ctx.db, "alice", w(d, 78.4));
      }
      await upsertWeight(ctx.db, "alice", w("2026-10-01", 78.4));
      expect(await updateWeightAction(null, form({ ...EDIT, weight: "72" }))).toMatchObject({
        needsConfirmation: { reason: "suspicious" },
      });
      expect(
        await updateWeightAction(null, form({ ...EDIT, weight: "72", confirm: "suspicious" })),
      ).toEqual({ ok: true });
    });

    it("reports a vanished row", async () => {
      expect(await updateWeightAction(null, form(EDIT))).toMatchObject({
        ok: false,
        formError: "Cette pesée n'existe plus.",
      });
    });
  });

  describe("updateMeasureAction", () => {
    it("edits the value of the row, whatever date the form claims", async () => {
      await upsertMeasure(ctx.db, "alice", { date: "2026-10-01", zone: "waist", valueCm: 90 });
      await upsertMeasure(ctx.db, "bob", { date: "2026-10-01", zone: "waist", valueCm: 99 });
      expect(await updateMeasureAction(null, form({ ...MEDIT, date: "2026-09-01" }))).toEqual({
        ok: true,
      });
      expect((await getMeasureOn(ctx.db, "alice", "2026-10-01", "waist"))?.valueCm).toBe(85);
      expect((await getMeasureOn(ctx.db, "bob", "2026-10-01", "waist"))?.valueCm).toBe(99);
      expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("rejects out-of-range values and reports a vanished row", async () => {
      expect(await updateMeasureAction(null, form({ ...MEDIT, value: "9" }))).toMatchObject({
        fieldErrors: { value: expect.any(Array) },
      });
      expect(await updateMeasureAction(null, form(MEDIT))).toMatchObject({
        ok: false,
        formError: "Cette mesure n'existe plus.",
      });
    });
  });

  describe("updateMeasureAction originalDate", () => {
    it.each(["", "nope"])(
      "reports a missing or invalid originalDate (%j) as a form error",
      async (od) => {
        expect(await updateMeasureAction(null, form({ ...MEDIT, originalDate: od }))).toMatchObject(
          {
            ok: false,
            formError: "Cette mesure n'existe plus.",
          },
        );
      },
    );
  });

  describe("delete and restore", () => {
    it("deletes a weighing and returns it, then restores it", async () => {
      await upsertWeight(ctx.db, "alice", { ...w("2026-10-01", 80), note: "sel" });
      const r = await deleteWeightAction("2026-10-01");
      expect(r).toEqual({
        ok: true,
        deleted: { date: "2026-10-01", weightKg: 80, bodyFatPct: null, note: "sel" },
      });
      expect(await listWeights(ctx.db, "alice")).toHaveLength(0);
      expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
      if (!r.ok) throw new Error("unreachable");
      expect(await restoreWeightAction(r.deleted)).toEqual({ ok: true });
      expect(await getWeightOn(ctx.db, "alice", "2026-10-01")).toMatchObject({
        weightKg: 80,
        note: "sel",
      });
    });

    it("deletes a measure and restores its session", async () => {
      await upsertMeasure(ctx.db, "alice", { date: "2026-10-01", zone: "waist", valueCm: 90 });
      const r = await deleteMeasureAction("2026-10-01", "waist");
      expect(r).toEqual({
        ok: true,
        deleted: { date: "2026-10-01", zone: "waist", valueCm: 90 },
      });
      expect(await listMeasures(ctx.db, "alice")).toHaveLength(0);
      if (!r.ok) throw new Error("unreachable");
      expect(await restoreMeasureAction(r.deleted)).toEqual({ ok: true });
      expect((await getMeasureOn(ctx.db, "alice", "2026-10-01", "waist"))?.valueCm).toBe(90);
    });

    it("cannot delete another user's rows, and a missing row is a harmless no-op", async () => {
      await upsertWeight(ctx.db, "bob", w("2026-10-01", 95));
      await upsertMeasure(ctx.db, "bob", { date: "2026-10-01", zone: "waist", valueCm: 99 });
      expect(await deleteWeightAction("2026-10-01")).toMatchObject({ ok: false });
      expect(await deleteMeasureAction("2026-10-01", "waist")).toMatchObject({ ok: false });
      expect(await getWeightOn(ctx.db, "bob", "2026-10-01")).not.toBeNull();
      expect(await getMeasureOn(ctx.db, "bob", "2026-10-01", "waist")).not.toBeNull();
      expect(ctx.revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects malformed delete inputs", async () => {
      expect(await deleteWeightAction("not-a-date")).toMatchObject({ ok: false });
      expect(await deleteMeasureAction("2026-10-01", "ear")).toMatchObject({ ok: false });
    });

    it("refuses forged restore payloads", async () => {
      const ok = { date: "2026-10-01", weightKg: 80, bodyFatPct: null, note: null };
      for (const bad of [
        { ...ok, weightKg: 5 },
        { ...ok, weightKg: 401 },
        { ...ok, weightKg: "80" },
        { ...ok, bodyFatPct: 90 },
        { ...ok, note: "x".repeat(141) },
        { ...ok, date: "2026-10-09" },
        { ...ok, date: "1800-01-01" },
        { ...ok, date: "nope" },
        null,
      ]) {
        expect(await restoreWeightAction(bad)).toMatchObject({ ok: false });
      }
      const m = { date: "2026-10-01", zone: "waist", valueCm: 90 };
      for (const bad of [
        { ...m, valueCm: 9 },
        { ...m, valueCm: 251 },
        { ...m, zone: "ear" },
        { ...m, date: "2026-10-09" },
      ]) {
        expect(await restoreMeasureAction(bad)).toMatchObject({ ok: false });
      }
      expect(await listWeights(ctx.db, "alice")).toHaveLength(0);
      expect(await listMeasures(ctx.db, "alice")).toHaveLength(0);
      expect(ctx.revalidatePath).not.toHaveBeenCalled();
    });

    it("restores for the session user even if the payload carries a userId", async () => {
      await restoreWeightAction({
        date: "2026-10-01",
        weightKg: 80,
        bodyFatPct: null,
        note: null,
        userId: "bob",
      });
      expect(await listWeights(ctx.db, "bob")).toHaveLength(0);
      expect(await listWeights(ctx.db, "alice")).toHaveLength(1);
    });
  });

  it("logs no health data when the database fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const realDb = ctx.db;
    const boom = () => {
      throw new Error("boom 78.4");
    };
    ctx.db = { select: boom, delete: boom, update: boom, transaction: boom } as unknown as Db;
    const results = [
      await updateWeightAction(null, form({ ...EDIT, weight: "78,4" })),
      await updateMeasureAction(null, form({ ...MEDIT, value: "85" })),
      await deleteWeightAction("2026-10-01"),
      await deleteMeasureAction("2026-10-01", "waist"),
      await restoreWeightAction({
        date: "2026-10-01",
        weightKg: 78.4,
        bodyFatPct: null,
        note: null,
      }),
      await restoreMeasureAction({ date: "2026-10-01", zone: "waist", valueCm: 85 }),
    ];
    ctx.db = realDb;
    for (const r of results) {
      expect(r).toMatchObject({ ok: false, formError: "Une erreur est survenue, réessaie." });
    }
    expect(error).toHaveBeenCalledTimes(6);
    for (const call of error.mock.calls) expect(call[1]).toEqual({ userId: "alice" });
    expect(JSON.stringify(error.mock.calls)).not.toMatch(/78|85/);
    error.mockRestore();
  });
});
