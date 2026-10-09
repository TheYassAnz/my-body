import type { Sparkline } from "@/features/dashboard/weight-summary";
import { ZONE_LABELS } from "@/features/measurements/copy";
import type { ZoneView } from "@/features/measurements/summary";
import { ZONES, type DeltaTone, type Zone } from "@/lib/metrics";

/**
 * Invented data for the public landing page. Fixed on purpose: it never depends on the
 * current date or on a user, and it is always shown as an example (never real data).
 */
const DATES = [
  "2026-07-01",
  "2026-07-08",
  "2026-07-15",
  "2026-07-22",
  "2026-07-29",
  "2026-08-05",
  "2026-08-12",
  "2026-08-19",
  "2026-08-26",
  "2026-09-02",
  "2026-09-09",
  "2026-09-16",
  "2026-09-23",
] as const;
const RAW_KG = [82.4, 81.6, 82.1, 81.3, 81.5, 80.9, 81.2, 80.4, 80.6, 80.0, 80.3, 79.5, 79.4];
const TREND_KG = [82.2, 82.0, 81.9, 81.7, 81.5, 81.3, 81.1, 80.9, 80.7, 80.5, 80.3, 80.0, 79.8];

export const PREVIEW_SPARKLINE: Sparkline = {
  from: "2026-07-01",
  to: "2026-09-30",
  dots: DATES.map((date, i) => ({ date, weightKg: RAW_KG[i] })),
  trend: DATES.map((date, i) => ({ date, trendKg: TREND_KG[i] })),
};
export const PREVIEW_TREND_KG = 79.8;
export const PREVIEW_RATE_KG = -0.4;

const MEASURED: Partial<Record<Zone, { value: string; delta: string; tone: DeltaTone }>> = {
  waist: { value: "81,5 cm", delta: "−3,5", tone: "positive" },
  arm: { value: "33,2 cm", delta: "+0,8", tone: "positive" },
  chest: { value: "96,0 cm", delta: "0", tone: "neutral" },
  hips: { value: "98,0 cm", delta: "−1,2", tone: "positive" },
  thigh: { value: "57,5 cm", delta: "+0,5", tone: "neutral" },
};

export const PREVIEW_ZONES: ZoneView[] = ZONES.map((zone) => {
  const label = ZONE_LABELS[zone];
  const m = MEASURED[zone];
  return {
    zone,
    label,
    valueText: m?.value ?? null,
    deltaText: m ? `${m.delta} cm` : null,
    tone: m?.tone ?? "neutral",
    ariaLabel: m
      ? `${label} : ${m.value}, ${m.delta} cm sur 30 jours`
      : `${label} : pas encore mesurée`,
  };
});
