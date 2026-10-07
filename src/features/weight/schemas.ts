import { z } from "zod";
import type { LocalDate } from "@/lib/dates";
import {
  formatDecimal,
  parseDecimal,
  round1,
  toDisplayWeight,
  toStoredKg,
  type WeightUnit,
} from "@/lib/units";
import {
  BODY_FAT_MAX_PCT,
  BODY_FAT_MIN_PCT,
  MIN_DATE,
  NOTE_MAX_LENGTH,
  WEIGHT_MAX_KG,
  WEIGHT_MIN_KG,
} from "./limits";

function weightRangeMessage(unit: WeightUnit): string {
  if (unit === "kg") return `Poids entre ${WEIGHT_MIN_KG} et ${WEIGHT_MAX_KG} kg`;
  const [min, max] = [WEIGHT_MIN_KG, WEIGHT_MAX_KG].map((kg) =>
    formatDecimal(toDisplayWeight(kg, "lb")),
  );
  return `Poids entre ${min} et ${max} lb`;
}

/** A weighing as typed in the sheet or at onboarding (specs/03 §9). Typed pounds become kilograms. */
export function weightEntrySchema(todayDate: LocalDate) {
  return z
    .object({
      date: z.iso
        .date({ error: "Date invalide" })
        .refine((d) => d >= MIN_DATE, { error: "Date invalide" })
        .refine((d) => d <= todayDate, { error: "La date ne peut pas être dans le futur" }),
      weight: z.string().optional(),
      unit: z.enum(["kg", "lb"]),
      bodyFat: z.string().optional(),
      note: z.string().optional(),
    })
    .transform((v, ctx) => {
      let invalid = false;
      const fail = (path: string, message: string) => {
        invalid = true;
        ctx.addIssue({ code: "custom", path: [path], message });
      };

      const weightKg = toStoredKg(parseDecimal(v.weight), v.unit);
      if (!Number.isFinite(weightKg) || weightKg < WEIGHT_MIN_KG || weightKg > WEIGHT_MAX_KG) {
        fail("weight", weightRangeMessage(v.unit));
      }

      let bodyFatPct: number | null = null;
      if (v.bodyFat?.trim()) {
        bodyFatPct = round1(parseDecimal(v.bodyFat));
        if (
          !Number.isFinite(bodyFatPct) ||
          bodyFatPct < BODY_FAT_MIN_PCT ||
          bodyFatPct > BODY_FAT_MAX_PCT
        ) {
          fail("bodyFat", `Masse grasse entre ${BODY_FAT_MIN_PCT} et ${BODY_FAT_MAX_PCT} %`);
        }
      }

      const note = v.note?.trim() || null;
      // Code points, like Postgres varchar(140): an emoji counts once.
      if (note && [...note].length > NOTE_MAX_LENGTH) {
        fail("note", `${NOTE_MAX_LENGTH} caractères maximum`);
      }

      if (invalid) return z.NEVER;
      return { date: v.date, weightKg, bodyFatPct, note, unit: v.unit };
    });
}
