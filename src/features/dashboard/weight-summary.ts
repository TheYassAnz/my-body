import { addDays, type LocalDate } from "@/lib/dates";
import {
  calibration,
  computeTrend,
  dailyTrendSeries,
  weeklyRate,
  type WeeklyRate,
  type WeightPoint,
} from "@/lib/metrics";

export const SPARKLINE_DAYS = 90;

export type Sparkline = {
  from: LocalDate;
  to: LocalDate;
  dots: WeightPoint[];
  trend: { date: LocalDate; trendKg: number }[];
};

export type WeightSummary =
  | { state: "empty" }
  | {
      state: "calibrating";
      latest: WeightPoint;
      todayKg: number | null;
      missingEntries: number;
      sparkline: Sparkline;
    }
  | {
      state: "ready";
      trendKg: number;
      todayKg: number | null;
      rate: WeeklyRate | null;
      sparkline: Sparkline;
    };

/** Everything the Accueil weight block shows, already computed (specs/01 §3.2, specs/03 §1-3). */
export function buildWeightSummary(
  entries: readonly WeightPoint[],
  todayDate: LocalDate,
): WeightSummary {
  const points = entries
    .filter((e) => e.date <= todayDate)
    .map(({ date, weightKg }) => ({ date, weightKg }));
  if (points.length === 0) return { state: "empty" };

  const trend = computeTrend(points);
  const last = trend[trend.length - 1];
  const todayKg = last.date === todayDate ? last.weightKg : null;
  const from = addDays(todayDate, -(SPARKLINE_DAYS - 1));
  const sparkline: Sparkline = {
    from,
    to: todayDate,
    dots: points.filter((p) => p.date >= from),
    trend: dailyTrendSeries(trend, from, todayDate),
  };

  const { calibrating, missingEntries } = calibration(points);
  if (calibrating) {
    return {
      state: "calibrating",
      latest: { date: last.date, weightKg: last.weightKg },
      todayKg,
      missingEntries,
      sparkline,
    };
  }
  return {
    state: "ready",
    trendKg: last.trendKg,
    todayKg,
    rate: weeklyRate(points, todayDate, last.trendKg),
    sparkline,
  };
}
