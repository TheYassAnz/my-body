import { addDays, type LocalDate } from "@/lib/dates";
import { MEASURE_NEGLIGIBLE_DELTA_CM } from "./config";
import type { GoalType } from "./goal-rates";

/** Fixed session order, top to bottom (specs/01 §3.5). */
export const ZONES = [
  "neck",
  "shoulders",
  "chest",
  "arm",
  "waist",
  "hips",
  "thigh",
  "calf",
] as const;
export type Zone = (typeof ZONES)[number];
export type DeltaPeriod = 7 | 30 | 90 | "start";
export type ZoneMeasure = { date: LocalDate; valueCm: number };
export type DeltaTone = "positive" | "neutral";
export type ZoneDelta = {
  current: ZoneMeasure | null;
  reference: ZoneMeasure | null;
  deltaCm: number | null;
  tone: DeltaTone;
};

/** specs/03 §6: which way is favourable, per zone and goal. A missing entry is never green. */
const FAVOURABLE: Record<Zone, Partial<Record<GoalType, "down" | "up">>> = {
  neck: { lose: "down" },
  shoulders: { gain: "up", recomp: "up" },
  chest: { gain: "up", recomp: "up" },
  arm: { gain: "up", recomp: "up" },
  waist: { lose: "down", recomp: "down" },
  hips: { lose: "down", recomp: "down" },
  thigh: { gain: "up", recomp: "up" },
  calf: { gain: "up", recomp: "up" },
};

const FEATURED: Record<GoalType, readonly Zone[]> = {
  lose: ["waist", "hips", "thigh"],
  gain: ["arm", "shoulders", "chest"],
  recomp: ["waist", "arm", "shoulders"],
  maintain: ["waist", "hips", "arm"],
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const byDate = (a: ZoneMeasure, b: ZoneMeasure) => a.date.localeCompare(b.date);

/** Difference to 1 decimal; a change below 0.3 cm counts as no change (specs/03 §6). */
export function measureDelta(fromCm: number, toCm: number): number {
  const delta = round1(toCm - fromCm);
  return Math.abs(delta) < MEASURE_NEGLIGIBLE_DELTA_CM ? 0 : delta;
}

export function deltaTone(zone: Zone, deltaCm: number | null, goal: GoalType | null): DeltaTone {
  if (deltaCm === null || deltaCm === 0 || goal === null) return "neutral";
  const way = FAVOURABLE[zone][goal];
  if (!way) return "neutral";
  return (way === "down" ? deltaCm < 0 : deltaCm > 0) ? "positive" : "neutral";
}

export function zoneDelta(
  zone: Zone,
  measures: readonly ZoneMeasure[],
  period: DeltaPeriod,
  today: LocalDate,
  goal: GoalType | null,
): ZoneDelta {
  const past = measures.filter((m) => m.date <= today).sort(byDate);
  if (past.length === 0) return { current: null, reference: null, deltaCm: null, tone: "neutral" };

  const current = past[past.length - 1];
  const limit = period === "start" ? null : addDays(today, -period);
  const reference =
    limit === null ? past[0] : ([...past].reverse().find((m) => m.date <= limit) ?? past[0]);
  if (reference.date === current.date) {
    return { current, reference: null, deltaCm: null, tone: "neutral" };
  }
  const deltaCm = measureDelta(reference.valueCm, current.valueCm);
  return { current, reference, deltaCm, tone: deltaTone(zone, deltaCm, goal) };
}

/** The three zones highlighted on the Accueil; no goal behaves like maintenance. */
export function featuredZones(goal: GoalType | null): readonly Zone[] {
  return FEATURED[goal ?? "maintain"];
}
