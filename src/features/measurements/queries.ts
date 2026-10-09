import { and, asc, count, eq, inArray, notExists } from "drizzle-orm";
import type { LocalDate } from "@/lib/dates";
import { measurement, measurementSession } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { Zone } from "@/lib/metrics";

export type MeasureRow = {
  id: string;
  sessionId: string;
  date: LocalDate;
  zone: Zone;
  valueCm: number;
};
export type NewMeasure = { date: LocalDate; zone: Zone; valueCm: number };

const columns = {
  id: measurement.id,
  sessionId: measurement.sessionId,
  date: measurementSession.date,
  zone: measurement.zone,
  valueCm: measurement.valueCm,
};

/** Every measure of the user, oldest first. The join is what binds a measure to its owner. */
export async function listMeasures(db: Db, userId: string): Promise<MeasureRow[]> {
  return db
    .select(columns)
    .from(measurement)
    .innerJoin(measurementSession, eq(measurement.sessionId, measurementSession.id))
    .where(eq(measurementSession.userId, userId))
    .orderBy(asc(measurementSession.date), asc(measurement.zone));
}

export async function getMeasureOn(
  db: Db,
  userId: string,
  date: LocalDate,
  zone: Zone,
): Promise<MeasureRow | null> {
  const [row] = await db
    .select(columns)
    .from(measurement)
    .innerJoin(measurementSession, eq(measurement.sessionId, measurementSession.id))
    .where(
      and(
        eq(measurementSession.userId, userId),
        eq(measurementSession.date, date),
        eq(measurement.zone, zone),
      ),
    );
  return row ?? null;
}

export async function countSessions(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(measurementSession)
    .where(eq(measurementSession.userId, userId));
  return row.n;
}

/**
 * Records a zone in the session of that date, creating the session if needed.
 * The conflict clause makes concurrent first writes of the day share one session.
 */
export async function upsertMeasure(db: Db, userId: string, m: NewMeasure): Promise<void> {
  await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(measurementSession)
      .values({ userId, date: m.date })
      .onConflictDoUpdate({
        target: [measurementSession.userId, measurementSession.date],
        set: { updatedAt: new Date() },
      })
      .returning({ id: measurementSession.id });
    await tx
      .insert(measurement)
      .values({ sessionId: session.id, zone: m.zone, valueCm: m.valueCm })
      .onConflictDoUpdate({
        target: [measurement.sessionId, measurement.zone],
        set: { valueCm: m.valueCm, updatedAt: new Date() },
      });
  });
}

/** Changes the value only; the date and zone identify the measure of THIS user. */
export async function updateMeasureValue(
  db: Db,
  userId: string,
  date: LocalDate,
  zone: Zone,
  valueCm: number,
): Promise<"updated" | "missing"> {
  const owned = db
    .select({ id: measurementSession.id })
    .from(measurementSession)
    .where(and(eq(measurementSession.userId, userId), eq(measurementSession.date, date)));
  const rows = await db
    .update(measurement)
    .set({ valueCm, updatedAt: new Date() })
    .where(and(eq(measurement.zone, zone), inArray(measurement.sessionId, owned)))
    .returning({ id: measurement.id });
  return rows.length ? "updated" : "missing";
}

/** Deletes one measure, and its session in the same transaction when it is left empty (EF-MEA-04). */
export async function deleteMeasure(
  db: Db,
  userId: string,
  date: LocalDate,
  zone: Zone,
): Promise<MeasureRow | null> {
  return db.transaction(async (tx) => {
    // Lock the session first: a concurrent upsert waits, so the emptiness check below is exact.
    const [locked] = await tx
      .select({ id: measurementSession.id })
      .from(measurementSession)
      .where(and(eq(measurementSession.userId, userId), eq(measurementSession.date, date)))
      .for("update");
    if (!locked) return null;
    const [row] = await tx
      .select(columns)
      .from(measurement)
      .innerJoin(measurementSession, eq(measurement.sessionId, measurementSession.id))
      .where(
        and(
          eq(measurementSession.userId, userId),
          eq(measurementSession.date, date),
          eq(measurement.zone, zone),
        ),
      );
    if (!row) return null;
    await tx.delete(measurement).where(eq(measurement.id, row.id));
    await tx
      .delete(measurementSession)
      .where(
        and(
          eq(measurementSession.id, row.sessionId),
          eq(measurementSession.userId, userId),
          notExists(
            tx
              .select({ one: measurement.id })
              .from(measurement)
              .where(eq(measurement.sessionId, row.sessionId)),
          ),
        ),
      );
    return row;
  });
}
