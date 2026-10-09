import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { measurement, measurementSession } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
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
