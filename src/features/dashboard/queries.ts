import { getActiveGoal } from "@/features/goals/queries";
import { buildGoalSummary, type GoalSummary } from "@/features/goals/summary";
import { listMeasures } from "@/features/measurements/queries";
import {
  buildMeasureBlock,
  waistSeries,
  type MeasureBlockData,
} from "@/features/measurements/summary";
import { listWeights } from "@/features/weight/queries";
import type { LocalDate } from "@/lib/dates";
import type { Db } from "@/lib/db/types";
import type { LengthUnit } from "@/lib/units";
import { paceTone } from "./pace-tone";
import { buildWeightSummary, type WeightSummary } from "./weight-summary";

/** Accueil data, computed server-side. */
export type Dashboard = {
  weight: WeightSummary;
  goal: GoalSummary;
  measures: MeasureBlockData;
  rateTone: "positive" | "neutral";
};

export type DashboardOptions = { lengthUnit: LengthUnit; reminderWeekday: number | null };

export async function getDashboard(
  db: Db,
  userId: string,
  todayDate: LocalDate,
  options: DashboardOptions = { lengthUnit: "cm", reminderWeekday: null },
): Promise<Dashboard> {
  const [points, active, measureRows] = await Promise.all([
    listWeights(db, userId),
    getActiveGoal(db, userId),
    listMeasures(db, userId),
  ]);
  const weight = buildWeightSummary(points, todayDate);
  const goal = buildGoalSummary(active, points, todayDate, waistSeries(measureRows));
  const measures = buildMeasureBlock({
    measures: measureRows,
    goal: active?.type ?? null,
    unit: options.lengthUnit,
    today: todayDate,
    reminderWeekday: options.reminderWeekday,
  });
  return { weight, goal, measures, rateTone: paceTone(goal, weight) };
}
