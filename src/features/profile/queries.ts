import { eq } from "drizzle-orm";
import { profile } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

export type Profile = typeof profile.$inferSelect;
export type Sex = Profile["sex"];
export type LengthUnit = Profile["lengthUnit"];

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(profile).where(eq(profile.userId, userId));
  return row ?? null;
}

export async function saveSex(db: Db, userId: string, sex: Sex, timezone: string) {
  await db
    .insert(profile)
    .values({ userId, sex, timezone })
    .onConflictDoUpdate({ target: profile.userId, set: { sex, updatedAt: new Date() } });
}

export async function saveBodyInfo(
  db: Db,
  userId: string,
  info: { heightCm: number; birthDate: string; lengthUnit: LengthUnit },
) {
  await db.update(profile).set(info).where(eq(profile.userId, userId));
}

export async function markOnboardingCompleted(db: Db, userId: string, at: Date = new Date()) {
  await db.update(profile).set({ onboardingCompletedAt: at }).where(eq(profile.userId, userId));
}

export type WeightUnit = Profile["weightUnit"];

export async function saveWeightUnit(db: Db, userId: string, weightUnit: WeightUnit) {
  await db.update(profile).set({ weightUnit }).where(eq(profile.userId, userId));
}

export async function saveUnits(
  db: Db,
  userId: string,
  units: { weightUnit: WeightUnit; lengthUnit: LengthUnit },
) {
  await db.update(profile).set(units).where(eq(profile.userId, userId));
}

/** 0 = Monday … 6 = Sunday, null = no reminder day (specs/04). */
export async function saveReminderWeekday(db: Db, userId: string, reminderWeekday: number | null) {
  await db.update(profile).set({ reminderWeekday }).where(eq(profile.userId, userId));
}
