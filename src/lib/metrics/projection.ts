import { addDays, type LocalDate } from "@/lib/dates";
import { PROJECTION_MAX_DAYS } from "./config";
import { daysToReach, type GoalType } from "./goal-rates";
import type { GoalStatusCode } from "./goal-status";

export type Projection =
  | { kind: "estimated"; date: LocalDate; daysRemaining: number }
  | { kind: "too_far" }
  | { kind: "unavailable" };

const PROJECTABLE: readonly GoalStatusCode[] = ["on_track", "too_slow", "too_fast"];

/**
 * specs/03 §5.4: only for loss or gain whose status is on_track, too_slow or too_fast.
 * `kgPerWeek` is the real pace from raw weighings (negative = losing).
 */
export function projectGoal(input: {
  type: GoalType;
  targetKg: number | null;
  status: GoalStatusCode;
  trendKg: number;
  kgPerWeek: number | null;
  today: LocalDate;
}): Projection {
  const { type, targetKg, status, trendKg, kgPerWeek, today } = input;
  const unavailable: Projection = { kind: "unavailable" };
  if ((type !== "lose" && type !== "gain") || targetKg === null) return unavailable;
  if (!PROJECTABLE.includes(status) || kgPerWeek === null) return unavailable;
  const towardTarget = type === "lose" ? kgPerWeek < 0 : kgPerWeek > 0;
  if (!towardTarget) return unavailable;

  const daysRemaining = daysToReach(Math.abs(targetKg - trendKg), Math.abs(kgPerWeek) / 7);
  if (daysRemaining > PROJECTION_MAX_DAYS) return { kind: "too_far" };
  return { kind: "estimated", date: addDays(today, daysRemaining), daysRemaining };
}

/** Share of the way done, between 0 and 1: (start − trend) / (start − target). */
export function goalProgress(startKg: number, trendKg: number, targetKg: number): number {
  const total = startKg - targetKg;
  if (total === 0) return 0;
  return Math.min(1, Math.max(0, (startKg - trendKg) / total));
}
