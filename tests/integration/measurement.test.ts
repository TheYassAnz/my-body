import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  countSessions,
  getMeasureOn,
  listMeasures,
  upsertMeasure,
} from "@/features/measurements/queries";
import { measurement, measurementSession, user } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { Zone } from "@/lib/metrics";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("measurement tables", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
  });
  afterEach(() => close());

  const newSession = async (date = "2026-10-03") => {
    const [s] = await db
      .insert(measurementSession)
      .values({ userId: "alice", date })
      .returning({ id: measurementSession.id });
    return s.id;
  };

  it("allows one session per user and day", async () => {
    await newSession();
    await expect(newSession()).rejects.toThrow();
  });

  it("allows one value per zone and session", async () => {
    const sessionId = await newSession();
    await db.insert(measurement).values({ sessionId, zone: "waist", valueCm: 84.5 });
    await expect(
      db.insert(measurement).values({ sessionId, zone: "waist", valueCm: 85 }),
    ).rejects.toThrow();
  });

  it("rejects values outside 10-250 cm and keeps the bounds", async () => {
    const sessionId = await newSession();
    for (const valueCm of [9.9, 250.1]) {
      await expect(
        db.insert(measurement).values({ sessionId, zone: "neck", valueCm }),
      ).rejects.toThrow();
    }
    await db.insert(measurement).values([
      { sessionId, zone: "neck", valueCm: 10 },
      { sessionId, zone: "calf", valueCm: 250 },
    ]);
    expect(await db.select().from(measurement)).toHaveLength(2);
  });

  it("rejects an unknown zone", async () => {
    const sessionId = await newSession();
    await expect(
      // @ts-expect-error: the enum only knows the eight zones
      db.insert(measurement).values({ sessionId, zone: "ankle", valueCm: 20 }),
    ).rejects.toThrow();
  });

  it("deletes the measures with their session", async () => {
    const sessionId = await newSession();
    await db.insert(measurement).values({ sessionId, zone: "waist", valueCm: 84.5 });
    await db.delete(measurementSession).where(eq(measurementSession.id, sessionId));
    expect(await db.select().from(measurement)).toHaveLength(0);
  });
});

describe("measurement queries", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  const put = (userId: string, date: string, zone: Zone, valueCm: number) =>
    upsertMeasure(db, userId, { date, zone, valueCm });

  it("completes the day's session as zones come in", async () => {
    await put("alice", "2026-10-03", "neck", 38.2);
    await put("alice", "2026-10-03", "chest", 101.4);
    expect(await countSessions(db, "alice")).toBe(1);
    const rows = await listMeasures(db, "alice");
    expect(rows.map((r) => [r.zone, r.valueCm])).toEqual([
      ["neck", 38.2],
      ["chest", 101.4],
    ]);
    expect(new Set(rows.map((r) => r.sessionId)).size).toBe(1);
  });

  it("replaces the value of a zone on the same date", async () => {
    await put("alice", "2026-10-03", "waist", 84.5);
    await put("alice", "2026-10-03", "waist", 83.9);
    const rows = await listMeasures(db, "alice");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ zone: "waist", valueCm: 83.9, date: "2026-10-03" });
  });

  it("deleting a user cascades to their sessions and measures only", async () => {
    await put("alice", "2026-10-03", "waist", 84);
    await put("bob", "2026-10-03", "waist", 90);
    await db.delete(user).where(eq(user.id, "alice"));
    expect(await countSessions(db, "alice")).toBe(0);
    expect(await listMeasures(db, "alice")).toEqual([]);
    expect(await countSessions(db, "bob")).toBe(1);
    expect(await listMeasures(db, "bob")).toHaveLength(1);
  });

  it("lists oldest first", async () => {
    await put("alice", "2026-10-03", "waist", 84);
    await put("alice", "2026-09-26", "waist", 85);
    expect((await listMeasures(db, "alice")).map((r) => r.date)).toEqual([
      "2026-09-26",
      "2026-10-03",
    ]);
  });

  it("lists the zones of a day in fixed order, not insertion order", async () => {
    await put("alice", "2026-10-03", "calf", 36);
    await put("alice", "2026-10-03", "neck", 38);
    await put("alice", "2026-10-03", "waist", 84);
    expect((await listMeasures(db, "alice")).map((r) => r.zone)).toEqual(["neck", "waist", "calf"]);
  });

  // PGlite serialises transactions on one connection, so this does not prove a real race.
  it("two simultaneous writes the same day end up in one session", async () => {
    await Promise.all([
      put("alice", "2026-10-03", "neck", 38),
      put("alice", "2026-10-03", "chest", 101),
      put("alice", "2026-10-03", "waist", 84),
    ]);
    expect(await countSessions(db, "alice")).toBe(1);
    expect(await listMeasures(db, "alice")).toHaveLength(3);
  });

  it("finds a measure of a date and zone", async () => {
    await put("alice", "2026-10-03", "waist", 84.5);
    expect(await getMeasureOn(db, "alice", "2026-10-03", "waist")).toMatchObject({ valueCm: 84.5 });
    expect(await getMeasureOn(db, "alice", "2026-10-03", "neck")).toBeNull();
    expect(await getMeasureOn(db, "alice", "2026-10-02", "waist")).toBeNull();
  });

  it("never shows or touches another user's measures, even on the same date", async () => {
    await put("alice", "2026-10-03", "waist", 84.5);
    await put("bob", "2026-10-03", "waist", 99);
    expect((await listMeasures(db, "alice")).map((r) => r.valueCm)).toEqual([84.5]);
    expect((await listMeasures(db, "bob")).map((r) => r.valueCm)).toEqual([99]);
    expect(await getMeasureOn(db, "bob", "2026-10-03", "waist")).toMatchObject({ valueCm: 99 });
    expect(await countSessions(db, "alice")).toBe(1);
    expect(await countSessions(db, "bob")).toBe(1);
    await put("alice", "2026-10-03", "waist", 80);
    expect((await listMeasures(db, "bob")).map((r) => r.valueCm)).toEqual([99]);
  });

  it("counts no session for an account that never measured", async () => {
    expect(await countSessions(db, "alice")).toBe(0);
    expect(await listMeasures(db, "alice")).toEqual([]);
  });
});
