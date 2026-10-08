import type { GoalSummary } from "@/features/goals/summary";
import { paceInGoalDirection } from "@/lib/metrics";
import type { WeightSummary } from "./weight-summary";

/** Green only when the real pace goes the way of a loss or gain goal (specs/01 §3.2). */
export function paceTone(goal: GoalSummary, weight: WeightSummary): "positive" | "neutral" {
  if (goal.state !== "active" || weight.state !== "ready" || !weight.rate) return "neutral";
  const v = paceInGoalDirection(goal.type, weight.rate.pctPerWeek);
  return v !== null && v > 0 ? "positive" : "neutral";
}
