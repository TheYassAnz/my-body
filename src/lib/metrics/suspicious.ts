import { SUSPICIOUS_DELTA_PCT, TREND_SEED_ENTRIES } from "./config";
import { currentTrend, type WeightPoint } from "./trend";

/**
 * EF-WGT-03: signed gap in kg between `weightKg` and the current trend when it
 * exceeds SUSPICIOUS_DELTA_PCT, else null. `points` excludes the weighing being
 * replaced. No trend (fewer than 3 weighings) means no warning.
 */
export function suspiciousDeviation(
  points: readonly WeightPoint[],
  weightKg: number,
): number | null {
  if (points.length < TREND_SEED_ENTRIES) return null;
  const trendKg = currentTrend(points) as number;
  const delta = weightKg - trendKg;
  return (Math.abs(delta) / trendKg) * 100 > SUSPICIOUS_DELTA_PCT ? delta : null;
}
