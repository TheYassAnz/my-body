import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getProfile,
  saveBodyInfo,
  saveReminderWeekday,
  saveSex,
  saveUnits,
} from "@/features/profile/queries";
import { listWeights, upsertWeight } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("settings queries", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    for (const id of ["alice", "bob"]) {
      await insertTestUser(db, id);
      await saveSex(db, id, "female", "Europe/Paris");
      await saveBodyInfo(db, id, { heightCm: 168, birthDate: "1990-04-12", lengthUnit: "cm" });
    }
  });
  afterEach(() => close());

  it("saveUnits changes only the target user", async () => {
    await saveUnits(db, "alice", { weightUnit: "lb", lengthUnit: "in" });

    expect(await getProfile(db, "alice")).toMatchObject({ weightUnit: "lb", lengthUnit: "in" });
    expect(await getProfile(db, "bob")).toMatchObject({ weightUnit: "kg", lengthUnit: "cm" });
  });

  it("changing the units rewrites no stored value", async () => {
    await upsertWeight(db, "alice", {
      date: "2026-10-01",
      weightKg: 78.4,
      bodyFatPct: null,
      note: null,
    });
    await saveUnits(db, "alice", { weightUnit: "lb", lengthUnit: "in" });
    await saveUnits(db, "alice", { weightUnit: "kg", lengthUnit: "cm" });

    expect((await listWeights(db, "alice"))[0].weightKg).toBe(78.4);
    expect((await getProfile(db, "alice"))?.heightCm).toBe(168);
  });

  it("saveReminderWeekday sets, clears, and the database refuses a bad day", async () => {
    await saveReminderWeekday(db, "alice", 2);
    expect((await getProfile(db, "alice"))?.reminderWeekday).toBe(2);
    await saveReminderWeekday(db, "alice", null);
    expect((await getProfile(db, "alice"))?.reminderWeekday).toBeNull();
    await expect(saveReminderWeekday(db, "alice", 7)).rejects.toThrow();
  });

  it("changing the sex keeps every weighing (EF-SET-01 CA1)", async () => {
    await upsertWeight(db, "alice", {
      date: "2026-10-01",
      weightKg: 78.4,
      bodyFatPct: null,
      note: null,
    });
    await saveSex(db, "alice", "male", "Europe/Paris");

    expect((await getProfile(db, "alice"))?.sex).toBe("male");
    expect(await listWeights(db, "alice")).toHaveLength(1);
  });
});
