import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/features/profile/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";
import { getWeightOn, insertWeights, listWeights, upsertWeight } from "./queries";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: ctx.revalidatePath }));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));

import { saveWeightAction } from "./actions";

const NNBSP = "\u202f";
const MINUS = "\u2212";
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
const w = (date: string, weightKg: number) => ({ date, weightKg, bodyFatPct: null, note: null });
const ENTRY = { date: "2026-10-03", weight: "78,4", unit: "kg" };

describe("saveWeightAction", () => {
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

  it("saves a weighing for the current user and refreshes every screen", async () => {
    expect(await saveWeightAction(null, form({ ...ENTRY, bodyFat: "21", note: " sel " }))).toEqual({
      ok: true,
    });
    expect(ctx.requireUser).toHaveBeenCalledWith("app");
    expect(await getWeightOn(ctx.db, "alice", "2026-10-03")).toMatchObject({
      weightKg: 78.4,
      bodyFatPct: 21,
      note: "sel",
    });
    expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("converts pounds to kilograms", async () => {
    await saveWeightAction(null, form({ ...ENTRY, weight: "172", unit: "lb" }));
    expect((await getWeightOn(ctx.db, "alice", "2026-10-03"))?.weightKg).toBe(78.02);
  });

  it("rejects out-of-range weights and writes nothing", async () => {
    for (const weight of ["19,9", "400,1"]) {
      const r = await saveWeightAction(null, form({ ...ENTRY, weight }));
      expect(r).toMatchObject({
        ok: false,
        fieldErrors: { weight: expect.any(Array) },
        values: { weight },
      });
    }
    expect(await listWeights(ctx.db, "alice")).toHaveLength(0);
    expect(ctx.revalidatePath).not.toHaveBeenCalled();
  });

  it("computes 'today' in the profile timezone", async () => {
    // 02:00 UTC on 4 Oct: 19:00 on 3 Oct in Los Angeles, 04:00 on 4 Oct in Paris.
    vi.setSystemTime(new Date("2026-10-04T02:00:00Z"));
    asAlice("America/Los_Angeles");
    const future = await saveWeightAction(null, form({ ...ENTRY, date: "2026-10-04" }));
    expect(future).toMatchObject({ ok: false, fieldErrors: { date: expect.any(Array) } });
    expect(await saveWeightAction(null, form(ENTRY))).toEqual({ ok: true });

    asAlice("Europe/Paris");
    expect(await saveWeightAction(null, form({ ...ENTRY, date: "2026-10-04" }))).toEqual({
      ok: true,
    });
  });

  it("asks before replacing the weighing of that date, then replaces it", async () => {
    await upsertWeight(ctx.db, "alice", w("2026-10-03", 78.2));
    const asked = await saveWeightAction(null, form({ ...ENTRY, weight: "78,9" }));
    expect(asked).toMatchObject({
      ok: false,
      needsConfirmation: {
        reason: "replace",
        message: `Remplacer 78,2${NNBSP}kg par 78,9${NNBSP}kg ?`,
      },
    });
    expect((await getWeightOn(ctx.db, "alice", "2026-10-03"))?.weightKg).toBe(78.2);

    const done = await saveWeightAction(
      null,
      form({ ...ENTRY, weight: "78,9", confirm: "replace" }),
    );
    expect(done).toEqual({ ok: true });
    const rows = await listWeights(ctx.db, "alice");
    expect(rows).toHaveLength(1);
    expect(rows[0].weightKg).toBe(78.9);
  });

  it("asks before saving a value more than 5 % away from the trend", async () => {
    await insertWeights(ctx.db, "alice", [
      w("2026-09-30", 78.4),
      w("2026-10-01", 78.4),
      w("2026-10-02", 78.4),
    ]);
    const asked = await saveWeightAction(null, form({ ...ENTRY, weight: "72" }));
    expect(asked).toMatchObject({
      ok: false,
      needsConfirmation: {
        reason: "suspicious",
        message: `72,0${NNBSP}kg ? C'est ${MINUS}6,4${NNBSP}kg par rapport à ta tendance. Confirmer ?`,
      },
    });
    expect(await getWeightOn(ctx.db, "alice", "2026-10-03")).toBeNull();

    expect(
      await saveWeightAction(null, form({ ...ENTRY, weight: "72", confirm: "suspicious" })),
    ).toEqual({
      ok: true,
    });
  });

  it("chains both confirmations, remembering the first one", async () => {
    await insertWeights(ctx.db, "alice", [
      w("2026-09-30", 78.4),
      w("2026-10-01", 78.4),
      w("2026-10-02", 78.4),
      w("2026-10-03", 78.4),
    ]);
    const first = await saveWeightAction(null, form({ ...ENTRY, weight: "72" }));
    expect(first).toMatchObject({ needsConfirmation: { reason: "replace" } });

    const second = await saveWeightAction(
      null,
      form({ ...ENTRY, weight: "72", confirm: "replace" }),
    );
    expect(second).toMatchObject({
      needsConfirmation: { reason: "suspicious" },
      values: { confirmed: "replace" },
    });

    const third = await saveWeightAction(
      null,
      form({ ...ENTRY, weight: "72", confirmed: "replace", confirm: "suspicious" }),
    );
    expect(third).toEqual({ ok: true });
    expect((await getWeightOn(ctx.db, "alice", "2026-10-03"))?.weightKg).toBe(72);
  });

  it("ignores a forged userId field", async () => {
    await upsertWeight(ctx.db, "bob", w("2026-10-03", 95));
    expect(await saveWeightAction(null, form({ ...ENTRY, userId: "bob" }))).toEqual({ ok: true });
    expect((await getWeightOn(ctx.db, "bob", "2026-10-03"))?.weightKg).toBe(95);
    expect((await getWeightOn(ctx.db, "alice", "2026-10-03"))?.weightKg).toBe(78.4);
  });

  it("returns a generic error when the database fails, without health data in logs", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const realDb = ctx.db;
    ctx.db = {
      select: () => {
        throw new Error("boom");
      },
    } as unknown as Db;
    const r = await saveWeightAction(null, form(ENTRY));
    ctx.db = realDb;
    expect(r).toMatchObject({ ok: false, formError: "Une erreur est survenue, réessaie." });
    expect(JSON.stringify(error.mock.calls)).not.toContain("78");
    error.mockRestore();
  });
});
