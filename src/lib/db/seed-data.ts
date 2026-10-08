import type { NewGoal } from "@/features/goals/queries";
import type { NewWeight } from "@/features/weight/queries";
import { addDays, type LocalDate } from "@/lib/dates";
import { currentTrend } from "@/lib/metrics";
import { round2 } from "@/lib/units";

export const DEMO_EMAIL = "demo@my-body.test";

/** Deterministic PRNG (mulberry32): the demo account is identical on every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `days` days of noisy weighings ending yesterday: −0.05 kg/day from 86 kg, ~15 % of days skipped. */
export function demoWeights(todayDate: LocalDate, days = 120, seed = 42): NewWeight[] {
  const random = mulberry32(seed);
  const out: NewWeight[] = [];
  for (let offset = days; offset >= 1; offset--) {
    const skip = random() < 0.15 && offset > 1;
    const noise = (random() - 0.5) * 1.2;
    if (skip) continue;
    out.push({
      date: addDays(todayDate, -offset),
      weightKg: round2(86 - 0.05 * (days - offset) + noise),
      bodyFatPct: null,
      note: offset % 17 === 0 ? "resto" : null,
    });
  }
  return out;
}

/** A loss goal started 30 days ago at the trend of that day: on track with the demo weighings. */
export function demoGoal(todayDate: LocalDate, weights: readonly NewWeight[]): NewGoal {
  const startDate = addDays(todayDate, -30);
  const trend = currentTrend(weights.filter((w) => w.date <= startDate)) ?? weights[0].weightKg;
  return {
    type: "lose",
    startDate,
    startWeightKg: round2(trend),
    targetWeightKg: 75,
    weeklyRatePct: 0.5,
  };
}
