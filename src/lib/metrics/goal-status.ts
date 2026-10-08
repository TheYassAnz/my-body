import { addDays, type LocalDate } from "@/lib/dates";
import {
  PLATEAU_THRESHOLD_PCT,
  PLATEAU_WINDOW_DAYS,
  RATE_WINDOW_DAYS,
  STABLE_BAND_PCT,
} from "./config";
import type { GoalType } from "./goal-rates";
import { calibration, weeklyRate } from "./rate";
import { currentTrend, sortByDate, type WeightPoint } from "./trend";

export type GoalSpec = {
  type: GoalType;
  startWeightKg: number;
  targetWeightKg: number | null;
  weeklyRatePct: number | null;
};
export type WaistMeasure = { date: LocalDate; valueCm: number };
export type WaistIndicator = "waist_insufficient" | "waist_improving" | "waist_flat";
export type GoalStatusCode =
  | "calibrating"
  | "achieved"
  | "plateau"
  | "wrong_direction"
  | "too_fast"
  | "too_slow"
  | "on_track"
  | "stable"
  | "out_of_band";
export type GoalStatus = {
  status: GoalStatusCode;
  /** Weighings still needed, while calibrating (at least 1); 0 otherwise. */
  missingEntries: number;
  /** Maintain and recomp: trend − reference, in kg. */
  deviationKg: number | null;
  /** Recomp only. */
  waist: WaistIndicator | null;
};

/** Tolerance on the ±1.5 % band, so a deviation of exactly 1.5 % stays inside. */
const BAND_EPSILON = 1e-9;
const WAIST_IMPROVING_CM = -0.5;

/**
 * What a goal is measured against today: the trend, or the latest weighing while
 * calibrating (EF-GOAL-01 CA4). Null without any weighing.
 */
export function goalReferenceKg(points: readonly WeightPoint[], today: LocalDate): number | null {
  const past = sortByDate(points.filter((p) => p.date <= today));
  if (past.length === 0) return null;
  return calibration(past).calibrating ? past[past.length - 1].weightKg : currentTrend(past);
}

/** Pace in the goal's direction (positive = good) against the chosen rate r (specs/03 §5.1, rows 4-7). */
export function classifyPace(
  v: number,
  r: number,
): "wrong_direction" | "too_fast" | "too_slow" | "on_track" {
  if (v < 0) return "wrong_direction";
  if (v > 1.5 * r) return "too_fast";
  if (v < 0.5 * r) return "too_slow";
  return "on_track";
}

/** specs/03 §3: loss → −rate, gain → +rate; null when the goal has no direction. */
export function paceInGoalDirection(type: GoalType, pctPerWeek: number): number | null {
  if (type === "lose") return -pctPerWeek;
  if (type === "gain") return pctPerWeek;
  return null;
}

/** specs/03 §5.3: last 28 days of waist measurements plus the one just before them. */
export function waistIndicator(
  measures: readonly WaistMeasure[],
  today: LocalDate,
): WaistIndicator {
  const past = sortByDate(measures.filter((m) => m.date <= today));
  const windowStart = addDays(today, -(RATE_WINDOW_DAYS - 1));
  const inWindow = past.filter((m) => m.date >= windowStart);
  const before = past.filter((m) => m.date < windowStart);
  const set = before.length ? [before[before.length - 1], ...inWindow] : inWindow;
  if (set.length < 2) return "waist_insufficient";
  const change = Math.round((set[set.length - 1].valueCm - set[0].valueCm) * 10) / 10;
  return change <= WAIST_IMPROVING_CM ? "waist_improving" : "waist_flat";
}

/** Status of the goal, evaluated in the order of specs/03 §5 (the first true case wins). */
export function goalStatus(
  goal: GoalSpec,
  points: readonly WeightPoint[],
  today: LocalDate,
  waist: readonly WaistMeasure[] = [],
): GoalStatus {
  const past = sortByDate(points.filter((p) => p.date <= today));
  const cal = calibration(past);
  const trendKg = currentTrend(past);
  const waistState = goal.type === "recomp" ? waistIndicator(waist, today) : null;
  const result = (status: GoalStatusCode, extra: Partial<GoalStatus> = {}): GoalStatus => ({
    status,
    missingEntries: 0,
    deviationKg: null,
    waist: waistState,
    ...extra,
  });

  if (cal.calibrating || trendKg === null) {
    return result("calibrating", { missingEntries: Math.max(1, cal.missingEntries) });
  }

  if (goal.type === "maintain" || goal.type === "recomp") {
    const deviationKg = trendKg - goal.startWeightKg;
    const outside =
      Math.abs(deviationKg) * 100 > goal.startWeightKg * STABLE_BAND_PCT + BAND_EPSILON;
    return result(outside ? "out_of_band" : "stable", { deviationKg });
  }

  const { targetWeightKg: target, weeklyRatePct: r } = goal;
  if (target === null || r === null)
    throw new Error("A loss or gain goal needs a target and a rate");

  if (goal.type === "lose" ? trendKg <= target : trendKg >= target) return result("achieved");

  const hasPlateauHistory = past[0].date <= addDays(today, -(PLATEAU_WINDOW_DAYS - 1));
  if (hasPlateauHistory) {
    const plateauRate = weeklyRate(past, today, trendKg, PLATEAU_WINDOW_DAYS);
    if (plateauRate && Math.abs(plateauRate.pctPerWeek) < PLATEAU_THRESHOLD_PCT) {
      return result("plateau");
    }
  }

  const rate = weeklyRate(past, today, trendKg);
  const v = paceInGoalDirection(goal.type, (rate as NonNullable<typeof rate>).pctPerWeek) as number;
  return result(classifyPace(v, r));
}
