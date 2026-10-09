import { z } from "zod";
import { MIN_DATE } from "@/features/weight/limits";
import type { LocalDate } from "@/lib/dates";
import { ZONES } from "@/lib/metrics";
import {
  formatDecimal,
  parseDecimal,
  toDisplayLength,
  toStoredCm,
  type LengthUnit,
} from "@/lib/units";
import { MEASURE_MAX_CM, MEASURE_MIN_CM } from "./limits";

function rangeMessage(unit: LengthUnit): string {
  if (unit === "cm") return `Mesure entre ${MEASURE_MIN_CM} et ${MEASURE_MAX_CM} cm`;
  const [min, max] = [MEASURE_MIN_CM, MEASURE_MAX_CM].map((cm) =>
    formatDecimal(toDisplayLength(cm, "in")),
  );
  return `Mesure entre ${min} et ${max} in`;
}

/** A measure as typed in the zone sheet or the guided session (specs/03 §9). Typed inches become centimetres. */
export function measureSchema(todayDate: LocalDate) {
  return z
    .object({
      date: z.iso
        .date({ error: "Date invalide" })
        .refine((d) => d >= MIN_DATE, { error: "Date invalide" })
        .refine((d) => d <= todayDate, { error: "La date ne peut pas être dans le futur" }),
      zone: z.enum(ZONES, { error: "Zone inconnue" }),
      value: z.string().optional(),
      unit: z.enum(["cm", "in"]),
    })
    .transform((v, ctx) => {
      const valueCm = toStoredCm(parseDecimal(v.value), v.unit);
      if (!Number.isFinite(valueCm) || valueCm < MEASURE_MIN_CM || valueCm > MEASURE_MAX_CM) {
        ctx.addIssue({ code: "custom", path: ["value"], message: rangeMessage(v.unit) });
        return z.NEVER;
      }
      return { date: v.date, zone: v.zone, valueCm, unit: v.unit };
    });
}
