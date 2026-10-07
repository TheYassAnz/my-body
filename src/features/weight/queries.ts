import { and, asc, desc, eq } from "drizzle-orm";
import type { LocalDate } from "@/lib/dates";
import { weightEntry } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

export type WeightEntry = typeof weightEntry.$inferSelect;
export type NewWeight = {
  date: LocalDate;
  weightKg: number;
  bodyFatPct: number | null;
  note: string | null;
};

/** Every weighing of the user, oldest first. */
export async function listWeights(db: Db, userId: string): Promise<WeightEntry[]> {
  return db
    .select()
    .from(weightEntry)
    .where(eq(weightEntry.userId, userId))
    .orderBy(asc(weightEntry.date));
}

export async function getWeightOn(
  db: Db,
  userId: string,
  date: LocalDate,
): Promise<WeightEntry | null> {
  const [row] = await db
    .select()
    .from(weightEntry)
    .where(and(eq(weightEntry.userId, userId), eq(weightEntry.date, date)));
  return row ?? null;
}

export async function getLatestWeight(db: Db, userId: string): Promise<WeightEntry | null> {
  const [row] = await db
    .select()
    .from(weightEntry)
    .where(eq(weightEntry.userId, userId))
    .orderBy(desc(weightEntry.date))
    .limit(1);
  return row ?? null;
}

export async function hasWeight(db: Db, userId: string): Promise<boolean> {
  return (await getLatestWeight(db, userId)) !== null;
}

/** Creates the weighing of that date, or replaces it (EF-WGT-02: one per day). */
export async function upsertWeight(db: Db, userId: string, w: NewWeight) {
  await db
    .insert(weightEntry)
    .values({ userId, ...w })
    .onConflictDoUpdate({
      target: [weightEntry.userId, weightEntry.date],
      set: { weightKg: w.weightKg, bodyFatPct: w.bodyFatPct, note: w.note, updatedAt: new Date() },
    });
}

/** Bulk insert, used by the demo seed. */
export async function insertWeights(db: Db, userId: string, rows: NewWeight[]) {
  if (rows.length) await db.insert(weightEntry).values(rows.map((r) => ({ userId, ...r })));
}
