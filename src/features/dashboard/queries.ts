import { getActiveGoal } from "@/features/goals/queries";
import { buildGoalSummary, type GoalSummary } from "@/features/goals/summary";
import { listWeights } from "@/features/weight/queries";
import type { LocalDate } from "@/lib/dates";
import type { Db } from "@/lib/db/types";
import { paceTone } from "./pace-tone";
import { buildWeightSummary, type WeightSummary } from "./weight-summary";

/** Accueil data, computed server-side. L4 adds the measurements. */
export type Dashboard = {
  weight: WeightSummary;
  goal: GoalSummary;
  rateTone: "positive" | "neutral";
};

export async function getDashboard(
  db: Db,
  userId: string,
  todayDate: LocalDate,
): Promise<Dashboard> {
  const [points, active] = await Promise.all([listWeights(db, userId), getActiveGoal(db, userId)]);
  const weight = buildWeightSummary(points, todayDate);
  const goal = buildGoalSummary(active, points, todayDate);
  return { weight, goal, rateTone: paceTone(goal, weight) };
}
