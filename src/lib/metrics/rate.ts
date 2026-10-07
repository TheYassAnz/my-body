import { addDays, daysBetween, type LocalDate } from "@/lib/dates";
import {
  CALIBRATION_MIN_ENTRIES,
  CALIBRATION_MIN_SPAN_DAYS,
  RATE_MIN_ENTRIES,
  RATE_WINDOW_DAYS,
} from "./config";
import { sortByDate, type WeightPoint } from "./trend";

export type Calibration = { calibrating: boolean; missingEntries: number };
export type WeeklyRate = { kgPerWeek: number; pctPerWeek: number };

/** specs/03 §2: at least 7 weighings, and 10 days between the first and the last. */
export function calibration(points: readonly WeightPoint[]): Calibration {
  const sorted = sortByDate(points);
  const n = sorted.length;
  const span = n ? daysBetween(sorted[0].date, sorted[n - 1].date) : 0;
  const missingEntries =
    n < CALIBRATION_MIN_ENTRIES
      ? CALIBRATION_MIN_ENTRIES - n
      : span < CALIBRATION_MIN_SPAN_DAYS
        ? 1
        : 0;
  return { calibrating: missingEntries > 0, missingEntries };
}

/**
 * Raw weighings of the last `windowDays` days (today included), extended to the
 * last `minEntries` weighings when the window holds fewer (specs/03 §3).
 */
export function rateWindow(
  points: readonly WeightPoint[],
  today: LocalDate,
  windowDays = RATE_WINDOW_DAYS,
  minEntries = RATE_MIN_ENTRIES,
): WeightPoint[] {
  const past = sortByDate(points).filter((p) => p.date <= today);
  const start = addDays(today, -(windowDays - 1));
  const inWindow = past.filter((p) => p.date >= start);
  return inWindow.length >= minEntries ? inWindow : past.slice(-minEntries);
}

/** Least-squares slope of weight against day number, in kg/day. */
export function slopePerDay(points: readonly WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const origin = points[0].date;
  const xs = points.map((p) => daysBetween(origin, p.date));
  const meanX = xs.reduce((s, x) => s + x, 0) / xs.length;
  const meanY = points.reduce((s, p) => s + p.weightKg, 0) / points.length;
  let num = 0;
  let den = 0;
  points.forEach((p, i) => {
    num += (xs[i] - meanX) * (p.weightKg - meanY);
    den += (xs[i] - meanX) ** 2;
  });
  return den === 0 ? null : num / den;
}

/** Real pace from raw weighings (no trend lag). Negative = losing. */
export function weeklyRate(
  points: readonly WeightPoint[],
  today: LocalDate,
  currentTrendKg: number,
  windowDays = RATE_WINDOW_DAYS,
): WeeklyRate | null {
  const slope = slopePerDay(rateWindow(points, today, windowDays));
  if (slope === null) return null;
  const kgPerWeek = slope * 7;
  return { kgPerWeek, pctPerWeek: (kgPerWeek / currentTrendKg) * 100 };
}
