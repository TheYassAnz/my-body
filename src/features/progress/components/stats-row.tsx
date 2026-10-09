import type { ProgressMetric } from "../params";
import type { ProgressSeries } from "../build-series";
import { formatDelta } from "@/lib/units";

const NNBSP = " ";
const suffix = (metric: ProgressMetric, wUnit: string, lUnit: string) =>
  metric === "weight" ? wUnit : metric === "bodyFat" ? "%" : lUnit;

/** Variation · Rythme (weight) or Écart vs début (others) · Mesures. "—" under two values, never NaN. */
export function StatsRow({
  stats,
  metric,
  weightUnit,
  lengthUnit,
  positive,
}: {
  stats: ProgressSeries["stats"];
  metric: ProgressMetric;
  weightUnit: string;
  lengthUnit: string;
  positive: boolean;
}) {
  const u = suffix(metric, weightUnit, lengthUnit);
  const signed = (v: number | null, per = "") =>
    v === null ? "—" : `${formatDelta(v)}${NNBSP}${u}${per}`;
  const items = [
    { label: "Variation", value: signed(stats.variation), good: positive },
    stats.secondary.kind === "rate"
      ? { label: "Rythme", value: signed(stats.secondary.value, "/sem"), good: false }
      : { label: "Écart vs début", value: signed(stats.secondary.value), good: false },
    { label: "Mesures", value: String(stats.count), good: false },
  ];
  return (
    <dl className="mt-4 grid grid-cols-3 gap-3">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-xs text-fg-2">{i.label}</dt>
          <dd className={`text-base font-semibold ${i.good ? "text-positive" : ""}`}>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
