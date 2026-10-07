import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getLatestWeight,
  getWeightOn,
  hasWeight,
  insertWeights,
  listWeights,
  upsertWeight,
} from "@/features/weight/queries";
import { user, weightEntry } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

const w = (date: string, weightKg: number) => ({ date, weightKg, bodyFatPct: null, note: null });

describe("weight entries", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  it("creates a weighing, then replaces it on the same date (one per day)", async () => {
    await upsertWeight(db, "alice", {
      date: "2026-10-03",
      weightKg: 78.2,
      bodyFatPct: 20.1,
      note: "sel",
    });
    await upsertWeight(db, "alice", {
      date: "2026-10-03",
      weightKg: 78.9,
      bodyFatPct: null,
      note: null,
    });
    const rows = await listWeights(db, "alice");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: "2026-10-03",
      weightKg: 78.9,
      bodyFatPct: null,
      note: null,
    });
  });

  it("lists only the caller's weighings, oldest first", async () => {
    await insertWeights(db, "alice", [w("2026-10-02", 79), w("2026-10-01", 80)]);
    await upsertWeight(db, "bob", w("2026-10-01", 95));
    expect((await listWeights(db, "alice")).map((r) => r.date)).toEqual([
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(await listWeights(db, "bob")).toHaveLength(1);
  });

  it("finds the weighing of a date and the latest one, per user", async () => {
    await insertWeights(db, "alice", [w("2026-10-01", 80), w("2026-10-02", 79)]);
    expect((await getWeightOn(db, "alice", "2026-10-01"))?.weightKg).toBe(80);
    expect(await getWeightOn(db, "bob", "2026-10-01")).toBeNull();
    expect((await getLatestWeight(db, "alice"))?.date).toBe("2026-10-02");
    expect(await getLatestWeight(db, "bob")).toBeNull();
    expect(await hasWeight(db, "alice")).toBe(true);
    expect(await hasWeight(db, "bob")).toBe(false);
  });

  it("never touches another user's weighing of the same date", async () => {
    await upsertWeight(db, "bob", w("2026-10-03", 95));
    await upsertWeight(db, "alice", w("2026-10-03", 60));
    expect((await getWeightOn(db, "bob", "2026-10-03"))?.weightKg).toBe(95);
  });

  it("enforces the ranges at the database level", async () => {
    await expect(upsertWeight(db, "alice", w("2026-10-03", 19.99))).rejects.toThrow();
    await expect(upsertWeight(db, "alice", w("2026-10-03", 400.01))).rejects.toThrow();
    await expect(
      upsertWeight(db, "alice", { ...w("2026-10-03", 80), bodyFatPct: 1.9 }),
    ).rejects.toThrow();
    await expect(
      upsertWeight(db, "alice", { ...w("2026-10-03", 80), note: "a".repeat(141) }),
    ).rejects.toThrow();
  });

  it("deletes the weighings with their user", async () => {
    await upsertWeight(db, "alice", w("2026-10-03", 80));
    await db.delete(user).where(eq(user.id, "alice"));
    expect(await db.select().from(weightEntry)).toHaveLength(0);
  });
});
