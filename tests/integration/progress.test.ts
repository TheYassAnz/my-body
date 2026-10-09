import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  countSessions,
  deleteMeasure,
  getMeasureOn,
  updateMeasureValue,
  upsertMeasure,
} from "@/features/measurements/queries";
import {
  deleteWeight,
  getWeightOn,
  listWeights,
  updateWeight,
  upsertWeight,
} from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("progress edit and delete queries", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  const w = (date: string, weightKg: number, bodyFatPct: number | null = null) => ({
    date,
    weightKg,
    bodyFatPct,
    note: null,
  });

  describe("updateWeight", () => {
    it("changes every field including the date", async () => {
      await upsertWeight(db, "alice", w("2026-10-01", 80, 20));
      const r = await updateWeight(db, "alice", "2026-10-01", {
        date: "2026-10-02",
        weightKg: 79.2,
        bodyFatPct: 19,
        note: "matin",
      });
      expect(r).toBe("updated");
      expect(await getWeightOn(db, "alice", "2026-10-01")).toBeNull();
      expect(await getWeightOn(db, "alice", "2026-10-02")).toMatchObject({
        weightKg: 79.2,
        bodyFatPct: 19,
        note: "matin",
      });
    });

    it("replaces the row already at the target date", async () => {
      await upsertWeight(db, "alice", w("2026-10-01", 80));
      await upsertWeight(db, "alice", w("2026-10-02", 75));
      expect(await updateWeight(db, "alice", "2026-10-01", w("2026-10-02", 79))).toBe("updated");
      const rows = await listWeights(db, "alice");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ date: "2026-10-02", weightKg: 79 });
    });

    it("edits in place when the date is unchanged", async () => {
      await upsertWeight(db, "alice", w("2026-10-01", 80));
      expect(await updateWeight(db, "alice", "2026-10-01", w("2026-10-01", 81))).toBe("updated");
      expect((await listWeights(db, "alice")).map((r) => r.weightKg)).toEqual([81]);
    });

    it("returns missing and changes nothing without a source row", async () => {
      await upsertWeight(db, "alice", w("2026-10-02", 75));
      expect(await updateWeight(db, "alice", "2026-10-01", w("2026-10-02", 79))).toBe("missing");
      expect((await getWeightOn(db, "alice", "2026-10-02"))?.weightKg).toBe(75);
    });

    it("returns missing when the source was just deleted, leaving the target alone", async () => {
      await upsertWeight(db, "alice", w("2026-10-01", 80));
      await upsertWeight(db, "alice", w("2026-10-02", 75));
      await deleteWeight(db, "alice", "2026-10-01");
      expect(await updateWeight(db, "alice", "2026-10-01", w("2026-10-02", 79))).toBe("missing");
      expect((await getWeightOn(db, "alice", "2026-10-02"))?.weightKg).toBe(75);
    });

    it("cannot touch another user's weighing at the same date", async () => {
      await upsertWeight(db, "alice", w("2026-10-01", 80));
      expect(await updateWeight(db, "bob", "2026-10-01", w("2026-10-01", 50))).toBe("missing");
      expect((await getWeightOn(db, "alice", "2026-10-01"))?.weightKg).toBe(80);
      expect(await listWeights(db, "bob")).toEqual([]);
    });
  });

  describe("deleteWeight", () => {
    it("returns the deleted row, then null", async () => {
      await upsertWeight(db, "alice", w("2026-10-01", 80, 20));
      const row = await deleteWeight(db, "alice", "2026-10-01");
      expect(row).toMatchObject({ date: "2026-10-01", weightKg: 80, bodyFatPct: 20 });
      expect(await deleteWeight(db, "alice", "2026-10-01")).toBeNull();
    });

    it("is a no-op for another user at the same date", async () => {
      await upsertWeight(db, "alice", w("2026-10-01", 80));
      expect(await deleteWeight(db, "bob", "2026-10-01")).toBeNull();
      expect(await getWeightOn(db, "alice", "2026-10-01")).not.toBeNull();
    });

    it("restores through upsertWeight", async () => {
      await upsertWeight(db, "alice", w("2026-10-01", 80, 20));
      const row = await deleteWeight(db, "alice", "2026-10-01");
      expect(row).not.toBeNull();
      await upsertWeight(db, "alice", {
        date: row!.date,
        weightKg: row!.weightKg,
        bodyFatPct: row!.bodyFatPct,
        note: row!.note,
      });
      expect((await getWeightOn(db, "alice", "2026-10-01"))?.weightKg).toBe(80);
    });
  });

  describe("measures", () => {
    const d = "2026-10-03";

    it("updateMeasureValue changes only the value of an existing measure", async () => {
      await upsertMeasure(db, "alice", { date: d, zone: "waist", valueCm: 84 });
      expect(await updateMeasureValue(db, "alice", d, "waist", 83)).toBe("updated");
      expect((await getMeasureOn(db, "alice", d, "waist"))?.valueCm).toBe(83);
      expect(await updateMeasureValue(db, "alice", d, "hips", 90)).toBe("missing");
      expect(await getMeasureOn(db, "alice", d, "hips")).toBeNull();
    });

    it("isolates users on update and delete", async () => {
      await upsertMeasure(db, "alice", { date: d, zone: "waist", valueCm: 84 });
      expect(await updateMeasureValue(db, "bob", d, "waist", 1)).toBe("missing");
      expect(await deleteMeasure(db, "bob", d, "waist")).toBeNull();
      expect((await getMeasureOn(db, "alice", d, "waist"))?.valueCm).toBe(84);
      expect(await countSessions(db, "alice")).toBe(1);
    });

    it("keeps the session when another measure remains", async () => {
      await upsertMeasure(db, "alice", { date: d, zone: "waist", valueCm: 84 });
      await upsertMeasure(db, "alice", { date: d, zone: "hips", valueCm: 95 });
      const row = await deleteMeasure(db, "alice", d, "waist");
      expect(row).toMatchObject({ date: d, zone: "waist", valueCm: 84 });
      expect(await countSessions(db, "alice")).toBe(1);
      expect(await getMeasureOn(db, "alice", d, "hips")).not.toBeNull();
    });

    it("deletes the session with its last measure, and upsert restores both", async () => {
      await upsertMeasure(db, "alice", { date: d, zone: "waist", valueCm: 84 });
      const row = await deleteMeasure(db, "alice", d, "waist");
      expect(await countSessions(db, "alice")).toBe(0);
      expect(await deleteMeasure(db, "alice", d, "waist")).toBeNull();
      expect(row).not.toBeNull();
      await upsertMeasure(db, "alice", { date: d, zone: row!.zone, valueCm: row!.valueCm });
      expect(await countSessions(db, "alice")).toBe(1);
      expect((await getMeasureOn(db, "alice", d, "waist"))?.valueCm).toBe(84);
    });
  });
});
