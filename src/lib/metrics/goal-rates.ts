import { addDays, type LocalDate } from "@/lib/dates";
import { PROJECTION_MAX_DAYS } from "./config";

export type RatedGoalType = "lose" | "gain";
export type GoalType = RatedGoalType | "maintain" | "recomp";

/** Weekly pace in % of body weight per week (specs/03 §4). */
export const GOAL_RATES = {
  lose: { min: 0.25, max: 1.5, recommendedMin: 0.5, recommendedMax: 1, default: 0.5 },
  gain: { min: 0.1, max: 0.75, recommendedMin: 0.1, recommendedMax: 0.5, default: 0.25 },
} as const satisfies Record<
  RatedGoalType,
  { min: number; max: number; recommendedMin: number; recommendedMax: number; default: number }
>;

export const RATE_STEP_PCT = 0.05;

/** Nearest multiple of the slider step (NaN stays NaN). */
export function snapRate(pct: number): number {
  return Math.round(pct / RATE_STEP_PCT) / (1 / RATE_STEP_PCT);
}

export function isRateInBounds(type: RatedGoalType, pct: number): boolean {
  const { min, max } = GOAL_RATES[type];
  return Number.isFinite(pct) && pct >= min && pct <= max;
}

/** True when the slider is in its alert zone, past the recommended range. */
export function exceedsRecommended(type: RatedGoalType, pct: number): boolean {
  return pct > GOAL_RATES[type].recommendedMax;
}

/** Live preview in kg/week: rate / 100 × current trend. */
export function previewKgPerWeek(pct: number, trendKg: number): number {
  return (pct / 100) * trendKg;
}

// 73 / 0.1 is 730.0000000000001: without this margin ceil() would add a day.
const DAY_EPSILON = 1e-9;

/** Whole days needed to cover `distanceKg` at `kgPerDay`, rounded up. */
export function daysToReach(distanceKg: number, kgPerDay: number): number {
  return Math.ceil(distanceKg / kgPerDay - DAY_EPSILON);
}

/** Date the target would be reached at the chosen pace, or null (no pace, or beyond 2 years). */
export function theoreticalDate(
  today: LocalDate,
  fromKg: number,
  targetKg: number,
  kgPerWeek: number,
): LocalDate | null {
  if (!(kgPerWeek > 0)) return null;
  const days = daysToReach(Math.abs(targetKg - fromKg), kgPerWeek / 7);
  return days > PROJECTION_MAX_DAYS ? null : addDays(today, Math.max(days, 0));
}
