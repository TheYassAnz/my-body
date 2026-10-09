import { addDays, daysBetween, type LocalDate } from "@/lib/dates";

export const PROGRESS_PERIODS = [
  { param: "1m", label: "1M", days: 30 },
  { param: "3m", label: "3M", days: 90 },
  { param: "6m", label: "6M", days: 180 },
  { param: "1a", label: "1A", days: 365 },
  { param: "tout", label: "Tout", days: null },
] as const;
export type ProgressPeriod = (typeof PROGRESS_PERIODS)[number]["param"];

const DEFAULT_DAYS = 90;

/** First day of the window (inclusive); "tout" starts at the first entry, null when there is none. */
export function windowStart(
  period: ProgressPeriod,
  today: LocalDate,
  firstDate: LocalDate | null,
): LocalDate | null {
  const days = PROGRESS_PERIODS.find((p) => p.param === period)!.days;
  return days === null ? firstDate : addDays(today, -days);
}

/** 3M, or "tout" when the history is shorter than 90 days (EF-PROG-01). */
export function defaultPeriod(firstDate: LocalDate | null, today: LocalDate): ProgressPeriod {
  return firstDate !== null && daysBetween(firstDate, today) < DEFAULT_DAYS ? "tout" : "3m";
}

/** Values already restricted to the window, sorted ascending by date. */
export function periodStats(values: readonly { date: LocalDate; value: number }[]) {
  const count = values.length;
  const first = count ? values[0].value : null;
  const last = count ? values[count - 1].value : null;
  const variation = count >= 2 ? values[count - 1].value - values[0].value : null;
  return { variation, count, first, last };
}
