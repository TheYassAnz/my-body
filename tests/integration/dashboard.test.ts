import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDashboard } from "@/features/dashboard/queries";
import { insertWeights, upsertWeight } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("getDashboard", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  it("summarises the caller's weighings only", async () => {
    await insertWeights(
      db,
      "alice",
      [
        "2026-09-21",
        "2026-09-23",
        "2026-09-25",
        "2026-09-27",
        "2026-09-29",
        "2026-09-30",
        "2026-10-01",
        "2026-10-02",
      ].map((date, i) => ({ date, weightKg: 80 - i * 0.2, bodyFatPct: null, note: null })),
    );
    await upsertWeight(db, "bob", {
      date: "2026-10-03",
      weightKg: 120,
      bodyFatPct: null,
      note: null,
    });

    const { weight } = await getDashboard(db, "alice", "2026-10-03");
    expect(weight).toMatchObject({ state: "ready", todayKg: null });
    expect(weight.state === "ready" && weight.trendKg).toBeLessThan(80);
    expect((await getDashboard(db, "bob", "2026-10-03")).weight).toMatchObject({
      state: "calibrating",
      todayKg: 120,
    });
  });
});
