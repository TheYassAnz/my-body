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

/** Ends the active goal and starts another, atomically (specs/05 §4.2). */
export async function replaceActiveGoal(
  db: Db,
  userId: string,
  g: NewGoal,
  endAs: EndStatus,
  endedAt: LocalDate,
) {
  await db.transaction(async (tx) => {
    await finishActiveGoal(tx, userId, endAs, endedAt);
    await createGoal(tx, userId, g);
  });
}

/** Ends the active goal. False when the user has none. */
export async function finishActiveGoal(
  db: Db,
  userId: string,
  endAs: EndStatus,
  endedAt: LocalDate,
): Promise<boolean> {
  const rows = await db
    .update(goal)
    .set({ status: endAs, endedAt })
    .where(and(eq(goal.userId, userId), eq(goal.status, "active")))
    .returning({ id: goal.id });
  return rows.length > 0;
}

/** EF-GOAL-02 CA2: changes target and rate in place. False when the user has no active goal. */
export async function updateActiveGoalTarget(
  db: Db,
  userId: string,
  t: { targetWeightKg: number; weeklyRatePct: number },
): Promise<boolean> {
  const rows = await db
    .update(goal)
    .set(t)
    .where(and(eq(goal.userId, userId), eq(goal.status, "active")))
    .returning({ id: goal.id });
  return rows.length > 0;
}
