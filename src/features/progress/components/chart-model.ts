import type { LocalDate } from "@/lib/dates";
import { formatDecimal } from "@/lib/units";
import type { ProgressSeries } from "../build-series";

export type Row = { t: number; value?: number; trend?: number; note?: string | null };

const t = (d: LocalDate) => Date.parse(`${d}T00:00:00Z`);

/** One row per day (raw weighing and/or trend), the projection segment, and a Y domain covering target and projection. */
export function chartModel(series: ProgressSeries) {
  const byT = new Map<number, Row>();
  const row = (d: LocalDate) => byT.get(t(d)) ?? byT.set(t(d), { t: t(d) }).get(t(d))!;
  for (const p of series.points) Object.assign(row(p.date), { value: p.value, note: p.note });
  for (const p of series.trend ?? []) row(p.date).trend = p.value;
  const data = [...byT.values()].sort((a, b) => a.t - b.t);
  const end = series.projection ? t(series.projection.to.date) : data[data.length - 1].t;
  const proj = series.projection
    ? [
        { t: t(series.projection.from.date), proj: series.projection.from.value },
        { t: end, proj: series.projection.to.value },
      ]
    : [];
  const values = [
    ...series.points.map((p) => p.value),
    ...(series.trend ?? []).map((p) => p.value),
    ...proj.map((p) => p.proj),
    ...(series.target === undefined ? [] : [series.target]),
  ];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || 1) * 0.1;
  const domain: [number, number] = [lo - pad, hi + pad];
  return { data, end, proj, domain };
}

/** Raw weighing (value + note) when there is one that day, else the trend value labelled as such. */
export function tooltipInfo(row: Row, unit: string): { text: string; note?: string | null } | null {
  const u = unit === "%" ? " %" : `\u202f${unit}`;
  if (row.value !== undefined) return { text: `${formatDecimal(row.value)}${u}`, note: row.note };
  if (row.trend !== undefined) return { text: `Tendance ${formatDecimal(row.trend)}${u}` };
  return null;
}
