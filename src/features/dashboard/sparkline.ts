import { daysBetween, type LocalDate } from "@/lib/dates";
import { round1 } from "@/lib/units";
import type { Sparkline } from "./weight-summary";

export type SparklineGeometry = { dots: { cx: number; cy: number }[]; trendPath: string };

/** SVG coordinates of the Accueil mini chart: x by day, y scaled to the visible values. */
export function sparklineGeometry(
  s: Sparkline,
  width: number,
  height: number,
  pad = 4,
): SparklineGeometry {
  const values = [...s.dots.map((d) => d.weightKg), ...s.trend.map((t) => t.trendKg)];
  if (values.length === 0) return { dots: [], trendPath: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = daysBetween(s.from, s.to) || 1;
  const x = (date: LocalDate) =>
    round1(pad + (daysBetween(s.from, date) / span) * (width - 2 * pad));
  const y = (kg: number) =>
    round1(max === min ? height / 2 : pad + ((max - kg) / (max - min)) * (height - 2 * pad));
  return {
    dots: s.dots.map((d) => ({ cx: x(d.date), cy: y(d.weightKg) })),
    trendPath: s.trend.map((t, i) => `${i ? "L" : "M"}${x(t.date)} ${y(t.trendKg)}`).join(" "),
  };
}
