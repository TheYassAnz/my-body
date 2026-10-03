"use server";

import "server-only";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, keepValues, type ActionResult } from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";
import { nextOnboardingStep } from "./onboarding";
import { getProfile, markOnboardingCompleted, saveBodyInfo, saveSex } from "./queries";
import { bodyStepSchema, sexStepSchema } from "./schemas";

export async function saveSexAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("onboarding");
  const parsed = sexStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  await saveSex(getDb(), user.userId, parsed.data.sex, parsed.data.timezone);
  redirect("/onboarding");
}

export async function saveBodyAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("onboarding");
  if (!user.profile) redirect("/onboarding");

  const parsed = bodyStepSchema(today(user.profile.timezone)).safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: keepValues(formData, "height", "birthDate"),
    };
  }

  const db = getDb();
  await saveBodyInfo(db, user.userId, parsed.data);
  if (nextOnboardingStep(await getProfile(db, user.userId)) === null) {
    await markOnboardingCompleted(db, user.userId);
    redirect("/accueil");
  }
  redirect("/onboarding");
}
