import { and, desc, eq, ne } from "drizzle-orm";
import type { LocalDate } from "@/lib/dates";
import { goal } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { GoalType } from "@/lib/metrics";

export type Goal = typeof goal.$inferSelect;
export type NewGoal = {
  type: GoalType;
  startDate: LocalDate;
  startWeightKg: number;
  targetWeightKg: number | null;
  weeklyRatePct: number | null;
};
export type EndStatus = "archived" | "achieved";

export async function getActiveGoal(db: Db, userId: string): Promise<Goal | null> {
  const [row] = await db
    .select()
    .from(goal)
    .where(and(eq(goal.userId, userId), eq(goal.status, "active")));
  return row ?? null;
}

/** Achieved and archived goals, most recent first (EF-GOAL-05). */
export async function listPastGoals(db: Db, userId: string): Promise<Goal[]> {
  return db
    .select()
    .from(goal)
    .where(and(eq(goal.userId, userId), ne(goal.status, "active")))
    .orderBy(desc(goal.startDate), desc(goal.createdAt));
}

export async function createGoal(db: Db, userId: string, g: NewGoal) {
  await db.insert(goal).values({ userId, ...g });
}

/** The goal the caller checked is no longer the active one (another tab changed it). */
export class StaleGoalError extends Error {}

/**
 * Ends the active goal and starts another, atomically (specs/05 §4.2).
 * With `expectedId`, only that goal may be ended; otherwise nothing is written
 * and StaleGoalError is thrown.
 */
export async function replaceActiveGoal(
  db: Db,
  userId: string,
  g: NewGoal,
  endAs: EndStatus,
  endedAt: LocalDate,
  expectedId?: string,
) {
  await db.transaction(async (tx) => {
    const finished = await finishActiveGoal(tx, userId, endAs, endedAt, expectedId);
    if (!finished && expectedId !== undefined) throw new StaleGoalError();
    await createGoal(tx, userId, g);
  });
}

/** Ends the active goal (the one `expectedId`, if given). False when none matched. */
export async function finishActiveGoal(
  db: Db,
  userId: string,
  endAs: EndStatus,
  endedAt: LocalDate,
  expectedId?: string,
): Promise<boolean> {
  const rows = await db
    .update(goal)
    .set({ status: endAs, endedAt })
    .where(
      and(
        eq(goal.userId, userId),
        eq(goal.status, "active"),
        expectedId === undefined ? undefined : eq(goal.id, expectedId),
      ),
    )
    .returning({ id: goal.id });
  return rows.length > 0;
}

/** EF-GOAL-02 CA2: changes target and rate of the checked goal in place. False when it is no longer the active one. */
export async function updateActiveGoalTarget(
  db: Db,
  userId: string,
  t: { targetWeightKg: number; weeklyRatePct: number },
  expectedId: string,
): Promise<boolean> {
  const rows = await db
    .update(goal)
    .set(t)
    .where(and(eq(goal.userId, userId), eq(goal.status, "active"), eq(goal.id, expectedId)))
    .returning({ id: goal.id });
  return rows.length > 0;
}
