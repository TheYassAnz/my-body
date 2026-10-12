import type { Sparkline } from "@/features/dashboard/weight-summary";
import { ZONE_LABELS } from "@/features/measurements/copy";
import type { ZoneView } from "@/features/measurements/summary";
import { deltaTone, ZONES, type Zone } from "@/lib/metrics";
import { formatLength, formatLengthDelta } from "@/lib/units";

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
export const PREVIEW_RATE_KG = -0.2;

// Recomposition goal: waist and hips down, arm and thigh up are favourable.
const MEASURED: Partial<Record<Zone, { valueCm: number; deltaCm: number }>> = {
  waist: { valueCm: 81.5, deltaCm: -3.5 },
  arm: { valueCm: 33.2, deltaCm: 0.8 },
  chest: { valueCm: 96, deltaCm: 0 },
  hips: { valueCm: 98, deltaCm: -1.2 },
  thigh: { valueCm: 57.5, deltaCm: 0.5 },
};

/** Same wording as the real zone summary ("moins 3,5 cm sur 30 jours"). */
function deltaPhrase(deltaCm: number): string {
  if (deltaCm === 0) return "stable sur 30 jours";
  return `${deltaCm < 0 ? "moins" : "plus"} ${formatLength(Math.abs(deltaCm), "cm")} sur 30 jours`;
}

export const PREVIEW_ZONES: ZoneView[] = ZONES.map((zone) => {
  const label = ZONE_LABELS[zone];
  const m = MEASURED[zone];
  if (!m) {
    return {
      zone,
      label,
      valueText: null,
      deltaText: null,
      tone: "neutral",
      ariaLabel: `${label} : pas encore mesurée`,
    };
  }
  const valueText = formatLength(m.valueCm, "cm");
  return {
    zone,
    label,
    valueText,
    deltaText: formatLengthDelta(m.deltaCm, "cm"),
    tone: deltaTone(zone, m.deltaCm, "recomp"),
    ariaLabel: `${label} : ${valueText}, ${deltaPhrase(m.deltaCm)}`,
  };
});
