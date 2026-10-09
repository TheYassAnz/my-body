import { PROGRESS_PERIODS, ZONES, type ProgressPeriod, type Zone } from "@/lib/metrics";

export type ProgressMetric = "weight" | "bodyFat" | Zone;
export const PAGE_SIZE = 50;
export const MAX_ROWS = 1000;

type Parsed = { metric: ProgressMetric; period: ProgressPeriod | null; rows: number };

const METRICS: readonly string[] = ["weight", "bodyFat", ...ZONES];

export function parseProgressParams(raw: { m?: string; p?: string; n?: string }): Parsed {
  const metric = (METRICS.includes(raw.m ?? "") ? raw.m : "weight") as ProgressMetric;
  const period = PROGRESS_PERIODS.find((o) => o.param === raw.p)?.param ?? null;
  const n = Number(raw.n);
  const rows = n > 0 ? Math.min(MAX_ROWS, Math.ceil(n / PAGE_SIZE) * PAGE_SIZE) : PAGE_SIZE;
  return { metric, period, rows };
}

export function progressHref(
  next: Partial<{ metric: ProgressMetric; period: ProgressPeriod; rows: number }>,
  current: Parsed,
): string {
  const { metric, period, rows } = { ...current, ...next };
  const q = new URLSearchParams();
  if (metric !== "weight") q.set("m", metric);
  if (period) q.set("p", period);
  if (rows !== PAGE_SIZE) q.set("n", String(rows));
  const s = q.toString();
  return s ? `/progres?${s}` : "/progres";
}
