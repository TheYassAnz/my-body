import type { LocalDate } from "@/lib/dates";
import type { Zone } from "@/lib/metrics";
import {
  formatDecimal,
  formatLength,
  formatWeight,
  KG_PER_LB,
  type LengthUnit,
  type WeightUnit,
} from "@/lib/units";
import { seriesOf } from "../measurements/summary";
import type { loadProgress } from "./queries";
import { PAGE_SIZE, type ProgressMetric } from "./params";

export type HistoryItem =
  | {
      kind: "weight";
      date: LocalDate;
      /** Value shown on the row: the weight, or the body fat for the % MG metric. */
      label: string;
      weightKg: number;
      bodyFatPct: number | null;
      note: string | null;
    }
  | { kind: "measure"; date: LocalDate; zone: Zone; label: string; valueCm: number };

export type History = { items: HistoryItem[]; total: number };

/** Newest first, cut to `rows`: the metric's whole history, not the chart period (EF-PROG-03). */
export function buildHistory(input: {
  data: Pick<Awaited<ReturnType<typeof loadProgress>>, "weights" | "measures">;
  metric: ProgressMetric;
  rows: number;
  weightUnit: WeightUnit;
  lengthUnit: LengthUnit;
}): History {
  const { data, metric, rows, weightUnit, lengthUnit } = input;
  const all: HistoryItem[] =
    metric === "weight" || metric === "bodyFat"
      ? data.weights
          .filter((w) => metric === "weight" || w.bodyFatPct != null)
          .map((w) => ({
            kind: "weight",
            date: w.date,
            label:
              metric === "weight"
                ? formatWeight(w.weightKg, weightUnit)
                : `${formatDecimal(w.bodyFatPct as number)} %`,
            weightKg: w.weightKg,
            bodyFatPct: w.bodyFatPct,
            note: w.note,
          }))
      : seriesOf(data.measures, metric).map((m) => ({
          kind: "measure",
          date: m.date,
          zone: metric,
          label: formatLength(m.valueCm, lengthUnit),
          valueCm: m.valueCm,
        }));
  const items = all.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, Math.max(rows, PAGE_SIZE));
  return { items, total: all.length };
}

/**
 * Value sent when the field was not touched: the stored value with enough decimals
 * (3 in the display unit) that parsing and converting it back gives the same stored value.
 * The 1-decimal display alone would shift the stored value.
 */
export const exactWeightInput = (kg: number, unit: WeightUnit) =>
  (unit === "lb" ? kg / KG_PER_LB : kg).toFixed(3);
export const exactLengthInput = (cm: number, unit: LengthUnit) =>
  (unit === "in" ? cm / 2.54 : cm).toFixed(3);
