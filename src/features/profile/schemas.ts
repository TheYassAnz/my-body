import { z } from "zod";
import { ageOn, isValidTimezone, type LocalDate } from "@/lib/dates";
import { inToCm, parseDecimal, round1 } from "@/lib/units";

export const sexStepSchema = z.object({
  sex: z.enum(["male", "female"], { error: "Choisis une silhouette" }),
  timezone: z.string().refine(isValidTimezone).catch("Europe/Paris"),
});

export function bodyStepSchema(todayDate: LocalDate) {
  return z
    .object({
      // "168,5" or "168.5"; parseDecimal also keeps round1 away from exponent notation.
      height: z
        .string({ error: "Taille invalide" })
        .transform(parseDecimal)
        .refine((h) => Number.isFinite(h), { error: "Taille entre 100 et 250 cm" }),
      lengthUnit: z.enum(["cm", "in"]),
      birthDate: z.iso.date({ error: "Date invalide" }),
    })
    .transform((v) => ({
      heightCm: v.lengthUnit === "in" ? inToCm(v.height) : round1(v.height),
      lengthUnit: v.lengthUnit,
      birthDate: v.birthDate,
    }))
    .superRefine((v, ctx) => {
      if (!Number.isFinite(v.heightCm) || v.heightCm < 100 || v.heightCm > 250) {
        ctx.addIssue({ code: "custom", path: ["height"], message: "Taille entre 100 et 250 cm" });
      }
      const age = ageOn(v.birthDate, todayDate);
      if (age < 16) {
        ctx.addIssue({
          code: "custom",
          path: ["birthDate"],
          message: "my-body est réservé aux 16 ans et plus",
        });
      } else if (age > 120) {
        ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Date invalide" });
      }
    });
}
