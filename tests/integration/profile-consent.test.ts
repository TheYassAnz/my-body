import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/types";
import { hasRequiredConsents, recordConsents } from "@/features/consent/queries";
import {
  getProfile,
  markOnboardingCompleted,
  saveBodyInfo,
  saveSex,
} from "@/features/profile/queries";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("consent and profile", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  it("requires both health-data and terms consents", async () => {
    expect(await hasRequiredConsents(db, "alice")).toBe(false);
    await recordConsents(db, "alice");
    expect(await hasRequiredConsents(db, "alice")).toBe(true);
    expect(await hasRequiredConsents(db, "bob")).toBe(false);
  });

  it("creates the profile at step 1 and completes it at step 2", async () => {
    await saveSex(db, "alice", "female", "Europe/Paris");
    let profile = await getProfile(db, "alice");
    expect(profile).toMatchObject({
      sex: "female",
      timezone: "Europe/Paris",
      heightCm: null,
      birthDate: null,
    });

    await saveBodyInfo(db, "alice", { heightCm: 168.5, birthDate: "1990-04-12", lengthUnit: "cm" });
    profile = await getProfile(db, "alice");
    expect(profile).toMatchObject({ heightCm: 168.5, birthDate: "1990-04-12", lengthUnit: "cm" });
  });

  it("changes only the sex when step 1 is saved again", async () => {
    await saveSex(db, "alice", "female", "Europe/Paris");
    await saveBodyInfo(db, "alice", { heightCm: 168.5, birthDate: "1990-04-12", lengthUnit: "cm" });
    await saveSex(db, "alice", "male", "Europe/Paris");
    expect(await getProfile(db, "alice")).toMatchObject({ sex: "male", heightCm: 168.5 });
  });

  it("never touches another user's profile", async () => {
    await saveSex(db, "alice", "female", "Europe/Paris");
    await saveBodyInfo(db, "alice", { heightCm: 168.5, birthDate: "1990-04-12", lengthUnit: "cm" });
    await markOnboardingCompleted(db, "alice");

    expect(await getProfile(db, "bob")).toBeNull();
    expect((await getProfile(db, "alice"))?.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it("rejects an out-of-range height at the database level", async () => {
    await saveSex(db, "alice", "female", "Europe/Paris");
    await expect(
      saveBodyInfo(db, "alice", { heightCm: 99, birthDate: "1990-04-12", lengthUnit: "cm" }),
    ).rejects.toThrow();
  });
});
