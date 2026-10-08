import { z } from "zod";
import { WEIGHT_MAX_KG, WEIGHT_MIN_KG } from "@/features/weight/limits";
import { GOAL_RATES, isRateInBounds, snapRate } from "@/lib/metrics";
import { parseDecimal, toStoredKg } from "@/lib/units";

const comma = (n: number) => String(n).replace(".", ",");

/**
 * A goal as typed in the form (specs/03 §4 and §9). `referenceKg` is the current
 * trend, or the latest weighing while calibrating. Typed pounds become kilograms.
 */
export function goalInputSchema(referenceKg: number) {
  return z
    .object({
      type: z.enum(["lose", "gain", "recomp", "maintain"], { error: "Choisis un type d'objectif" }),
      unit: z.enum(["kg", "lb"]),
      target: z.string().optional(),
      rate: z.string().optional(),
    })
    .transform((v, ctx) => {
      const { type, unit } = v;
      if (type === "maintain" || type === "recomp") {
        return { type, unit, targetWeightKg: null, weeklyRatePct: null };
      }

      let invalid = false;
      const fail = (path: string, message: string) => {
        invalid = true;
        ctx.addIssue({ code: "custom", path: [path], message });
      };

      const targetWeightKg = toStoredKg(parseDecimal(v.target), unit);
      if (
        !Number.isFinite(targetWeightKg) ||
        targetWeightKg < WEIGHT_MIN_KG ||
        targetWeightKg > WEIGHT_MAX_KG
      ) {
        fail("target", `Cible entre ${WEIGHT_MIN_KG} et ${WEIGHT_MAX_KG} kg`);
      } else if (type === "lose" && targetWeightKg >= referenceKg) {
        fail("target", "La cible doit être inférieure à ton poids actuel");
      } else if (type === "gain" && targetWeightKg <= referenceKg) {
        fail("target", "La cible doit être supérieure à ton poids actuel");
      }

      const weeklyRatePct = snapRate(parseDecimal(v.rate));
      if (!isRateInBounds(type, weeklyRatePct)) {
        const { min, max } = GOAL_RATES[type];
        fail("rate", `Rythme entre ${comma(min)} et ${comma(max)} % par semaine`);
      }

      if (invalid) return z.NEVER;
      return { type, unit, targetWeightKg, weeklyRatePct };
    });
}
