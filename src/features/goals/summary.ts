import type { LocalDate } from "@/lib/dates";
import {
  currentTrend,
  goalProgress,
  goalReferenceKg,
  goalStatus,
  projectGoal,
  weeklyRate,
  type GoalSpec,
  type GoalStatus,
  type GoalType,
  type Projection,
  type WaistMeasure,
  type WeeklyRate,
  type WeightPoint,
} from "@/lib/metrics";
import type { Goal } from "./queries";

export type ActiveGoalSummary = {
  state: "active";
  type: GoalType;
  targetKg: number | null;
  weeklyRatePct: number | null;
  startKg: number;
  startDate: LocalDate;
  /** Trend, or latest weighing while calibrating. */
  referenceKg: number;
  status: GoalStatus;
  /** Loss and gain only: "3,6 / 7,0 kg" and the bar. */
  progress: { doneKg: number; totalKg: number; ratio: number } | null;
  projection: Projection;
  /** Real pace over 4 weeks, null while calibrating. */
  rate: WeeklyRate | null;
};
export type GoalSummary = { state: "none" } | ActiveGoalSummary;

/** Everything the goal blocks show, already computed (specs/01 §3.2 and §3.7). */
export function buildGoalSummary(
  goal: (GoalSpec & { startDate: LocalDate }) | null,
  points: readonly WeightPoint[],
  today: LocalDate,
  waist: readonly WaistMeasure[] = [],
): GoalSummary {
  if (!goal) return { state: "none" };
  const past = points.filter((p) => p.date <= today);
  const referenceKg = goalReferenceKg(past, today) ?? goal.startWeightKg;
  const status = goalStatus(goal, past, today, waist);
  const rate = status.status === "calibrating" ? null : weeklyRate(past, today, referenceKg);

  const rated = goal.targetWeightKg !== null;
  const totalKg = rated ? Math.abs(goal.startWeightKg - (goal.targetWeightKg as number)) : 0;
  const progress = rated
    ? {
        doneKg: Math.min(
          totalKg,
          Math.max(
            0,
            goal.type === "lose"
              ? goal.startWeightKg - referenceKg
              : referenceKg - goal.startWeightKg,
          ),
        ),
        totalKg,
        ratio: goalProgress(goal.startWeightKg, referenceKg, goal.targetWeightKg as number),
      }
    : null;

  return {
    state: "active",
    type: goal.type,
    targetKg: goal.targetWeightKg,
    weeklyRatePct: goal.weeklyRatePct,
    startKg: goal.startWeightKg,
    startDate: goal.startDate,
    referenceKg,
    status,
    progress,
    projection: projectGoal({
      type: goal.type,
      targetKg: goal.targetWeightKg,
      status: status.status,
      trendKg: referenceKg,
      kgPerWeek: rate?.kgPerWeek ?? null,
      today,
    }),
    rate,
  };
}

export type PastGoalSummary = {
  id: string;
  type: GoalType;
  status: "achieved" | "archived";
  startDate: LocalDate;
  endedAt: LocalDate;
  startKg: number;
  /** Trend on the last day of the goal, null if nothing was weighed by then. */
  endKg: number | null;
};

/** EF-GOAL-05: type, period, start weight, end trend (computed at read time) and status. */
export function buildGoalHistory(
  goals: readonly Goal[],
  points: readonly WeightPoint[],
): PastGoalSummary[] {
  return goals.flatMap((g) =>
    g.status === "active" || g.endedAt === null
      ? []
      : [
          {
            id: g.id,
            type: g.type,
            status: g.status,
            startDate: g.startDate,
            endedAt: g.endedAt,
            startKg: g.startWeightKg,
            endKg: currentTrend(points.filter((p) => p.date <= (g.endedAt as string))),
          },
        ],
  );
}
