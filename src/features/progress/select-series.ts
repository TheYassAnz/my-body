import type { LocalDate } from "@/lib/dates";
import { defaultPeriod, type ProgressPeriod } from "@/lib/metrics";
import type { LengthUnit, WeightUnit } from "@/lib/units";
import { seriesOf } from "../measurements/summary";
import type { loadProgress } from "./queries";
import { buildSimpleSeries, buildWeightSeries, type ProgressSeries } from "./build-series";
import type { ProgressMetric } from "./params";

type Data = Awaited<ReturnType<typeof loadProgress>>;

/** Picks the metric (bodyFat without data falls back to weight) and the period, then builds the series. */
export function selectSeries(input: {
  data: Data;
  metric: ProgressMetric;
  period: ProgressPeriod | null;
  today: LocalDate;
  weightUnit: WeightUnit;
  lengthUnit: LengthUnit;
}): {
  metric: ProgressMetric;
  period: ProgressPeriod;
  hasBodyFat: boolean;
  series: ProgressSeries;
} {
  const { data, today } = input;
  const fat = data.weights
    .filter((w) => w.bodyFatPct != null)
    .map((w) => ({ date: w.date, value: w.bodyFatPct as number }));
  const hasBodyFat = fat.length > 0;
  const metric = input.metric === "bodyFat" && !hasBodyFat ? "weight" : input.metric;

  const rows =
    metric === "weight"
      ? data.weights.map((w) => ({ date: w.date }))
      : metric === "bodyFat"
        ? fat
        : seriesOf(data.measures, metric).map((m) => ({ date: m.date, value: m.valueCm }));
  const first = rows.map((r) => r.date).sort()[0] ?? null;
  const period = input.period ?? defaultPeriod(first, today);

  const series =
    metric === "weight"
      ? buildWeightSeries({
          weights: data.weights,
          goal: data.goal,
          unit: input.weightUnit,
          today,
          period,
        })
      : buildSimpleSeries({
          rows: rows as { date: LocalDate; value: number }[],
          unit: metric === "bodyFat" ? "pct" : input.lengthUnit,
          today,
          period,
        });
  return { metric, period, hasBodyFat, series };
}
