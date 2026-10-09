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

/**
 * Edits the weighing of `fromDate` (date included) in one transaction. A row already at the
 * new date is replaced; the caller has confirmed that (EF-WGT-02).
 */
export async function updateWeight(
  db: Db,
  userId: string,
  fromDate: LocalDate,
  w: NewWeight,
): Promise<"updated" | "missing"> {
  return db.transaction(async (tx) => {
    const own = and(eq(weightEntry.userId, userId), eq(weightEntry.date, fromDate));
    const [source] = await tx
      .select({ id: weightEntry.id })
      .from(weightEntry)
      .where(own)
      .for("update");
    if (!source) return "missing";
    if (w.date !== fromDate) {
      await tx
        .delete(weightEntry)
        .where(and(eq(weightEntry.userId, userId), eq(weightEntry.date, w.date)));
    }
    const updated = await tx
      .update(weightEntry)
      .set({ ...w, updatedAt: new Date() })
      .where(and(eq(weightEntry.id, source.id), eq(weightEntry.userId, userId)))
      .returning({ id: weightEntry.id });
    // The source row is locked above, so this cannot happen; throw to roll back the target delete.
    if (!updated.length) throw new Error("weight update matched no row");
    return "updated";
  });
}

/** Returns the deleted row (so the caller can offer an undo), or null when there was none. */
export async function deleteWeight(
  db: Db,
  userId: string,
  date: LocalDate,
): Promise<WeightEntry | null> {
  const [row] = await db
    .delete(weightEntry)
    .where(and(eq(weightEntry.userId, userId), eq(weightEntry.date, date)))
    .returning();
  return row ?? null;
}
