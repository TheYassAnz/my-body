import { safeNext } from "@/lib/access";
import { fieldErrorsFrom, keepValues, type ActionResult } from "@/lib/action-result";
import { authClient } from "@/lib/auth/client";
import { recordSignUpConsentsAction } from "./actions";
import { GENERIC_ERROR, TOO_MANY_ATTEMPTS, VERIFIED_CALLBACK } from "./messages";
import {
  deleteAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

/*
 * Browser-side form actions for useActionState. They call Better Auth over HTTP
 * through authClient so its rate limits apply (auth.api calls bypass them).
 * Same contract as Server Actions: validate with Zod, never throw, return ActionResult.
 */

type AuthError = { status: number; code?: string } | null;

/** Full navigation: the new session cookie must reach the server-rendered pages. */
function navigate(url: string): void {
  window.location.assign(url);
}

async function call(request: () => Promise<{ error: AuthError }>): Promise<AuthError> {
  try {
    return (await request()).error;
  } catch {
    // Network failure: no response from the server.
    return { status: 0 };
  }
}

export async function signUpAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const values = keepValues(formData, "email");
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };
  const { email, password, consentHealth, consentTerms } = parsed.data;

  const error = await call(() =>
    authClient.signUp.email({
      // name is required by Better Auth; we derive it from the email (no new personal data).
      name: email.split("@")[0],
      email,
      password,
      callbackURL: VERIFIED_CALLBACK,
    }),
  );
  if (error) {
    if (error.code?.startsWith("USER_ALREADY_EXISTS")) {
      return {
        ok: false,
        fieldErrors: { email: ["Un compte existe déjà avec cet email."] },
        values,
      };
    }
    if (error.status === 429) return { ok: false, formError: TOO_MANY_ATTEMPTS, values };
    return { ok: false, formError: GENERIC_ERROR, values };
  }

  try {
    await recordSignUpConsentsAction({ consentHealth, consentTerms });
  } catch {
    // The /consentement guard asks again if the consents were not saved.
  }
  navigate("/onboarding");
  return { ok: true };
}

export async function signInAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const values = keepValues(formData, "email");
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const error = await call(() => authClient.signIn.email(parsed.data));
  if (error) {
    if (error.status === 429) return { ok: false, formError: TOO_MANY_ATTEMPTS, values };
    if (error.status === 0) return { ok: false, formError: GENERIC_ERROR, values };
    return { ok: false, formError: "Email ou mot de passe incorrect", values };
  }
  navigate(safeNext(formData.get("next")));
  return { ok: true };
}

export async function requestPasswordResetAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const values = keepValues(formData, "email");
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const error = await call(() =>
    authClient.requestPasswordReset({ email: parsed.data.email, redirectTo: "/reinitialiser" }),
  );
  // The rate limit is per IP: saying so reveals nothing about the account.
  if (error?.status === 429) {
    return { ok: false, formError: "Trop de demandes. Réessaie plus tard.", values };
  }
  // Same answer whether or not the account exists (EF-AUTH-04 CA1).
  return { ok: true };
}

export async function resetPasswordAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  const error = await call(() =>
    authClient.resetPassword({ token: parsed.data.token, newPassword: parsed.data.password }),
  );
  if (error) {
    if (error.status === 429) return { ok: false, formError: TOO_MANY_ATTEMPTS };
    return { ok: false, formError: "Ce lien est invalide ou a expiré. Refais une demande." };
  }
  navigate("/connexion?reinitialise=1");
  return { ok: true };
}

/** EF-SET-05. Over HTTP so the /delete-user rate limit applies (a guess is a password attempt). */
export async function deleteAccountAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  const { password } = parsed.data;
  const error = await call(() => authClient.deleteUser(password ? { password } : {}));
  if (error) {
    if (error.status === 429) return { ok: false, formError: TOO_MANY_ATTEMPTS };
    if (error.code?.startsWith("INVALID_PASSWORD")) {
      return { ok: false, fieldErrors: { password: ["Mot de passe incorrect"] } };
    }
    if (error.code?.startsWith("PASSWORD_REQUIRED")) {
      return { ok: false, fieldErrors: { password: ["Saisis ton mot de passe"] } };
    }
    if (error.code?.startsWith("SESSION_EXPIRED")) {
      return { ok: false, formError: "Pour ta sécurité, reconnecte-toi puis recommence." };
    }
    return { ok: false, formError: GENERIC_ERROR };
  }
  navigate("/");
  return { ok: true };
}
