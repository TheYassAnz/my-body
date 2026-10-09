import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildExport, isExportKind } from "@/features/export/build";
import { upsertMeasure } from "@/features/measurements/queries";
import { upsertWeight } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("export", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
    await upsertWeight(db, "alice", {
      date: "2026-10-01",
      weightKg: 78.4,
      bodyFatPct: null,
      note: "ok",
    });
    await upsertWeight(db, "bob", {
      date: "2026-10-01",
      weightKg: 95,
      bodyFatPct: null,
      note: null,
    });
    await upsertMeasure(db, "alice", { date: "2026-10-01", zone: "waist", valueCm: 85.5 });
    await upsertMeasure(db, "bob", { date: "2026-10-01", zone: "waist", valueCm: 110 });
  });
  afterEach(() => close());

  it("exports only the user's weighings", async () => {
    const csv = await buildExport(db, "alice", "pesees");
    expect(csv).toContain("2026-10-01;78.4;;ok");
    expect(csv).not.toContain("95");
  });

  it("exports only the user's measures", async () => {
    const csv = await buildExport(db, "alice", "mensurations");
    expect(csv).toContain("2026-10-01;waist;85.5");
    expect(csv).not.toContain("110");
  });

  it("gives a header-only file to a user without data", async () => {
    await insertTestUser(db, "carol");
    expect(await buildExport(db, "carol", "pesees")).toBe(
      "﻿date;poids_kg;masse_grasse_pct;note\r\n",
    );
    expect(await buildExport(db, "carol", "mensurations")).toBe("﻿date;zone;valeur_cm\r\n");
  });

  it("only knows the two export files", () => {
    expect(isExportKind("pesees")).toBe(true);
    expect(isExportKind("mensurations")).toBe(true);
    for (const other of ["", "users", "../etc/passwd", "PESEES"]) {
      expect(isExportKind(other)).toBe(false);
    }
  });
});
