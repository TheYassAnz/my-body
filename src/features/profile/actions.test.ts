import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profile } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));

import { saveBodyAction, saveSexAction } from "./actions";

const form = (values: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
};
const BODY = { height: "170", lengthUnit: "cm", birthDate: "1990-04-12" };

describe("profile server actions", () => {
  let close: () => Promise<void>;

  const row = async (id: string) =>
    (await ctx.db.select().from(profile).where(eq(profile.userId, id)))[0] ?? null;
  const asAlice = async (withProfile: boolean) => {
    ctx.requireUser.mockResolvedValue({
      userId: "alice",
      email: "alice@example.com",
      emailVerified: true,
      profile: withProfile ? await row("alice") : null,
    });
  };

  beforeEach(async () => {
    ({ db: ctx.db, close } = await createTestDb());
    await insertTestUser(ctx.db, "alice");
    await insertTestUser(ctx.db, "bob");
  });
  afterEach(async () => {
    vi.clearAllMocks();
    await close();
  });

  describe("saveSexAction", () => {
    it("creates the profile for the current user and goes on", async () => {
      await asAlice(false);
      await expect(
        saveSexAction(null, form({ sex: "female", timezone: "Europe/Paris" })),
      ).rejects.toThrow("REDIRECT /onboarding");
      expect(ctx.requireUser).toHaveBeenCalledWith("onboarding");
      expect(await row("alice")).toMatchObject({ sex: "female", timezone: "Europe/Paris" });
    });

    it("returns a field error without a silhouette", async () => {
      await asAlice(false);
      const r = await saveSexAction(null, form({ timezone: "Europe/Paris" }));
      expect(r).toMatchObject({ ok: false, fieldErrors: { sex: expect.any(Array) } });
      expect(await row("alice")).toBeNull();
    });

    it("ignores a forged userId field", async () => {
      await asAlice(false);
      await ctx.db.insert(profile).values({ userId: "bob", sex: "male", timezone: "Europe/Paris" });
      const before = await row("bob");
      await expect(
        saveSexAction(null, form({ sex: "female", timezone: "Europe/Paris", userId: "bob" })),
      ).rejects.toThrow("REDIRECT");
      expect(await row("bob")).toEqual(before);
      expect(await row("alice")).toMatchObject({ sex: "female" });
    });
  });

  describe("saveBodyAction", () => {
    beforeEach(async () => {
      await ctx.db
        .insert(profile)
        .values({ userId: "alice", sex: "female", timezone: "Europe/Paris" });
      await asAlice(true);
    });

    it("saves the body info, completes onboarding and opens the app", async () => {
      await expect(saveBodyAction(null, form(BODY))).rejects.toThrow("REDIRECT /accueil");
      expect(await row("alice")).toMatchObject({
        heightCm: 170,
        birthDate: "1990-04-12",
        lengthUnit: "cm",
        onboardingCompletedAt: expect.any(Date),
      });
    });

    it("refuses an invalid height and changes nothing", async () => {
      const before = await row("alice");
      const r = await saveBodyAction(null, form({ ...BODY, height: "99" }));
      expect(r).toMatchObject({ ok: false, fieldErrors: { height: expect.any(Array) } });
      expect(await row("alice")).toEqual(before);
    });

    it("refuses an under-16 birth date and changes nothing", async () => {
      const before = await row("alice");
      const r = await saveBodyAction(null, form({ ...BODY, birthDate: "2999-01-01" }));
      expect(r).toMatchObject({ ok: false, fieldErrors: { birthDate: expect.any(Array) } });
      expect(await row("alice")).toEqual(before);
    });

    it("ignores a forged userId field", async () => {
      await ctx.db.insert(profile).values({ userId: "bob", sex: "male", timezone: "Europe/Paris" });
      const before = await row("bob");
      await expect(saveBodyAction(null, form({ ...BODY, userId: "bob" }))).rejects.toThrow(
        "REDIRECT /accueil",
      );
      expect(await row("bob")).toEqual(before);
      expect(await row("alice")).toMatchObject({ heightCm: 170 });
    });

    it("sends users without a profile row back to step 1 and writes nothing", async () => {
      await ctx.db.delete(profile).where(eq(profile.userId, "alice"));
      await asAlice(false);
      await expect(saveBodyAction(null, form(BODY))).rejects.toThrow("REDIRECT /onboarding");
      expect(await ctx.db.select().from(profile)).toHaveLength(0);
    });
  });
});
