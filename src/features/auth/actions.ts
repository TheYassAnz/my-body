"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CONSENT_VERSION, hasRequiredConsents, recordConsents } from "@/features/consent/queries";
import { fieldErrorsFrom, type ActionResult } from "@/lib/action-result";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";
import { GENERIC_ERROR, VERIFIED_CALLBACK } from "./messages";
import { consentSchema } from "./schemas";

/*
 * Sign-up, sign-in and password reset run in the browser through `authClient`
 * (see client-actions.ts): Better Auth only rate-limits HTTP /api/auth/* requests.
 * This file keeps what is not a Better Auth flow, or must run with the server session.
 */

/** recordConsents is not idempotent: skip when this version is already accepted (double submit). */
async function saveConsents(userId: string): Promise<void> {
  const db = getDb();
  if (await hasRequiredConsents(db, userId, CONSENT_VERSION)) return;
  await recordConsents(db, userId);
}

/** Called by the sign-up form right after the account is created over HTTP. */
export async function recordSignUpConsentsAction(input: unknown): Promise<ActionResult> {
  const parsed = consentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    const session = await getAuth().api.getSession({ headers: await headers() });
    if (!session) return { ok: false, formError: GENERIC_ERROR };
    await saveConsents(session.user.id);
  } catch {
    console.error("consent_record_failed");
    return { ok: false, formError: GENERIC_ERROR };
  }
  return { ok: true };
}

export async function acceptConsentsAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("consent");
  const parsed = consentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  try {
    await saveConsents(user.userId);
  } catch {
    console.error("consent_record_failed");
    return { ok: false, formError: GENERIC_ERROR };
  }
  redirect("/onboarding");
}

export async function signOutAction(): Promise<void> {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch {
    // No valid session: going to sign-in is the expected outcome anyway.
  }
  redirect("/connexion");
}

/**
 * Goes through the Better Auth HTTP handler (not auth.api) so the
 * /send-verification-email rate limit applies, with the caller's IP and cookie.
 */
export async function resendVerificationAction(): Promise<ActionResult> {
  const user = await requireUser("settings");
  if (user.emailVerified) return { ok: true };

  try {
    const auth = getAuth();
    const incoming = await headers();
    const forwarded = new Headers({ "content-type": "application/json" });
    for (const name of ["cookie", "origin", "user-agent", "x-forwarded-for", "x-real-ip"]) {
      const value = incoming.get(name);
      if (value) forwarded.set(name, value);
    }
    const { baseURL } = await auth.$context;
    const res = await auth.handler(
      new Request(`${baseURL}/send-verification-email`, {
        method: "POST",
        headers: forwarded,
        body: JSON.stringify({ email: user.email, callbackURL: VERIFIED_CALLBACK }),
      }),
    );
    if (res.status === 429) {
      return { ok: false, formError: "Patiente un peu avant de renvoyer l'email." };
    }
    if (!res.ok) {
      console.error("verification_resend_failed", { status: res.status });
      return { ok: false, formError: GENERIC_ERROR };
    }
  } catch {
    console.error("verification_resend_failed");
    return { ok: false, formError: GENERIC_ERROR };
  }
  return { ok: true };
}
