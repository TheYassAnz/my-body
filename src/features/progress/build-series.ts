import type { LocalDate } from "@/lib/dates";
import {
  computeTrend,
  dailyTrendSeries,
  measureDelta,
  periodStats,
  weeklyRate,
  windowStart,
  type ProgressPeriod,
} from "@/lib/metrics";
import {
  formatDecimal,
  formatDelta,
  formatLength,
  formatLengthDelta,
  formatWeight,
  round1,
  toDisplayLength,
  toDisplayWeight,
  type LengthUnit,
  type WeightUnit,
} from "@/lib/units";
import { buildGoalSummary } from "../goals/summary";
import type { Goal } from "../goals/queries";
import type { WeightEntry } from "../weight/queries";
import { NO_DATA_SUMMARY, PERIOD_PHRASES } from "./copy";

export type ChartPoint = { date: LocalDate; value: number; note?: string | null };
export type ProgressSeries = {
  points: ChartPoint[];
  trend?: { date: LocalDate; value: number }[];
  target?: number;
  projection?: { from: ChartPoint; to: ChartPoint };
  stats: {
    variation: number | null;
    secondary: { kind: "rate" | "sinceStart"; value: number | null };
    count: number;
  };
  summary: string;
};

const empty = (kind: "rate" | "sinceStart"): ProgressSeries => ({
  points: [],
  stats: { variation: null, secondary: { kind, value: null }, count: 0 },
  summary: NO_DATA_SUMMARY,
});

export function buildWeightSeries(input: {
  weights: WeightEntry[];
  goal: Goal | null;
  unit: WeightUnit;
  today: LocalDate;
  period: ProgressPeriod;
}): ProgressSeries {
  const { goal, unit, today, period } = input;
  const all = input.weights
    .filter((w) => w.date <= today)
    .map(({ date, weightKg }) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const from = windowStart(period, today, all[0]?.date ?? null);
  const inWindow =
    from === null ? [] : input.weights.filter((w) => w.date >= from && w.date <= today);
  if (from === null || inWindow.length === 0) return empty("rate");

  // Trend over the whole history, then cut: recomputing on the window would drift.
  const fullTrend = computeTrend(all);
  const trendKg = dailyTrendSeries(fullTrend, from, today);
  const trend = trendKg.map((t) => ({ date: t.date, value: toDisplayWeight(t.trendKg, unit) }));
  const stats = periodStats(trendKg.map((t) => ({ date: t.date, value: t.trendKg })));
  const lastTrendKg = fullTrend[fullTrend.length - 1].trendKg;
  const rate = weeklyRate(all, today, lastTrendKg);

  const points = [...inWindow]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({ date: w.date, value: toDisplayWeight(w.weightKg, unit), note: w.note }));

  const series: ProgressSeries = {
    points,
    trend,
    stats: {
      variation:
        points.length < 2 || stats.variation === null
          ? null
          : toDisplayWeight(stats.variation, unit),
      secondary: { kind: "rate", value: rate ? toDisplayWeight(rate.kgPerWeek, unit) : null },
      count: points.length,
    },
    summary: "",
  };
  if (goal?.targetWeightKg != null) series.target = toDisplayWeight(goal.targetWeightKg, unit);

  const projection = buildGoalSummary(goal, all, today);
  if (projection.state === "active" && projection.projection.kind === "estimated") {
    // shortcut: drawn up to the estimated date even past the window end (always within the projection cap).
    series.projection = {
      from: { date: today, value: toDisplayWeight(lastTrendKg, unit) },
      to: {
        date: projection.projection.date,
        value: toDisplayWeight(goal!.targetWeightKg as number, unit),
      },
    };
  }

  const startTrend = formatDecimal(trend[0].value);
  const head =
    points.length > 1
      ? `Tendance de ${startTrend} à ${formatWeight(trendKg[trendKg.length - 1].trendKg, unit)}`
      : `Tendance à ${formatWeight(lastTrendKg, unit)}`;
  const tail = rate
    ? `, ${formatDelta(toDisplayWeight(rate.kgPerWeek, unit))} ${unit}/semaine`
    : "";
  series.summary = `${head} sur ${PERIOD_PHRASES[period]}${tail}`;
  return series;
}

export function buildSimpleSeries(input: {
  rows: { date: LocalDate; value: number }[];
  unit: "pct" | LengthUnit;
  today: LocalDate;
  period: ProgressPeriod;
}): ProgressSeries {
  const { unit, today, period } = input;
  const all = input.rows
    .filter((r) => r.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const from = windowStart(period, today, all[0]?.date ?? null);
  const inWindow = from === null ? [] : all.filter((r) => r.date >= from);
  if (inWindow.length === 0) return empty("sinceStart");

  // Stored values (cm or %) in, display values out.
  const show = (v: number) => (unit === "pct" ? round1(v) : toDisplayLength(v, unit));
  const diff = (a: number, b: number) => (unit === "pct" ? round1(b - a) : measureDelta(a, b));
  const fmt = (v: number) => (unit === "pct" ? `${formatDecimal(v)} %` : formatLength(v, unit));
  const fmtDelta = (d: number) =>
    unit === "pct" ? `${formatDelta(d)} %` : formatLengthDelta(d, unit);

  const stats = periodStats(inWindow);
  const variation =
    stats.variation === null ? null : diff(inWindow[0].value, inWindow.at(-1)!.value);
  const sinceStart = all.length >= 2 ? diff(all[0].value, all.at(-1)!.value) : null;

  const phrase = PERIOD_PHRASES[period];
  const summary =
    variation === null
      ? `Une mesure sur ${phrase} : ${fmt(inWindow[0].value)}`
      : `De ${fmt(inWindow[0].value)} à ${fmt(inWindow.at(-1)!.value)} sur ${phrase}, ${fmtDelta(variation)}`;

  return {
    points: inWindow.map((r) => ({ date: r.date, value: show(r.value) })),
    stats: {
      variation: variation === null ? null : displayDelta(variation, unit),
      secondary: {
        kind: "sinceStart",
        value: sinceStart === null ? null : displayDelta(sinceStart, unit),
      },
      count: inWindow.length,
    },
    summary,
  };
}

const displayDelta = (d: number, unit: "pct" | LengthUnit) =>
  unit === "pct" ? d : toDisplayLength(d, unit);
