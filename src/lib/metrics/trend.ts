import { addDays, daysBetween, type LocalDate } from "@/lib/dates";
import { TREND_ALPHA, TREND_SEED_ENTRIES } from "./config";

export type WeightPoint = { date: LocalDate; weightKg: number };
export type TrendPoint = WeightPoint & { trendKg: number };

export function sortByDate<T extends { date: LocalDate }>(points: readonly T[]): T[] {
  // ISO dates sort lexically.
  return [...points].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Exponential moving average adjusted to missing days (specs/03 §1),
 * seeded on the running mean of the first TREND_SEED_ENTRIES weighings.
 */
export function computeTrend(points: readonly WeightPoint[]): TrendPoint[] {
  const out: TrendPoint[] = [];
  let seedSum = 0;
  for (const { date, weightKg } of sortByDate(points)) {
    const i = out.length;
    let trendKg: number;
    if (i < TREND_SEED_ENTRIES) {
      seedSum += weightKg;
      trendKg = seedSum / (i + 1);
    } else {
      const prev = out[i - 1];
      const gap = Math.max(1, daysBetween(prev.date, date));
      const alpha = 1 - (1 - TREND_ALPHA) ** gap;
      trendKg = prev.trendKg + alpha * (weightKg - prev.trendKg);
    }
    out.push({ date, weightKg, trendKg });
  }
  return out;
}

/** Trend of the latest weighing (never extrapolated), or null without any. */
export function currentTrend(points: readonly WeightPoint[]): number | null {
  const trend = computeTrend(points);
  return trend.length ? trend[trend.length - 1].trendKg : null;
}

/**
 * One value per day from `from` to `to` for charts: days without weighing repeat
 * the last known trend. `trend` must be sorted (output of computeTrend).
 */
export function dailyTrendSeries(
  trend: readonly TrendPoint[],
  from: LocalDate,
  to: LocalDate,
): { date: LocalDate; trendKg: number }[] {
  const out: { date: LocalDate; trendKg: number }[] = [];
  let i = 0;
  let current: number | null = null;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    while (i < trend.length && trend[i].date <= day) {
      current = trend[i].trendKg;
      i++;
    }
    if (current !== null) out.push({ date: day, trendKg: current });
  }
  return out;
}
