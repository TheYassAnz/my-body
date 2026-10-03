import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Adresse email invalide" }));

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: `Au moins ${PASSWORD_MIN_LENGTH} caractères` })
  .max(128, { error: "128 caractères maximum" });

const consents = {
  consentHealth: z.literal("on", {
    error: "Ce consentement est nécessaire pour suivre ta progression",
  }),
  consentTerms: z.literal("on", { error: "Tu dois accepter les conditions d'utilisation" }),
};

export const signUpSchema = z.object({ email, password: newPassword, ...consents });
export const consentSchema = z.object(consents);
export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Mot de passe requis" }),
});
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z
  .object({ token: z.string().min(1), password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    error: "Les deux mots de passe ne correspondent pas",
  });
