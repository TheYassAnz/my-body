"use server";

import "server-only";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, keepValues, type ActionResult } from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { hasWeight, upsertWeight } from "@/features/weight/queries";
import { weightEntrySchema } from "@/features/weight/schemas";
import type { Db } from "@/lib/db/types";
import { requireUser } from "@/lib/session";
import { nextOnboardingStep } from "./onboarding";
import {
  getProfile,
  markOnboardingCompleted,
  saveBodyInfo,
  saveSex,
  saveWeightUnit,
} from "./queries";
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

/** Completes onboarding when every step is filled, else shows the next step. */
async function continueOnboarding(db: Db, userId: string): Promise<never> {
  const [profile, weighed] = await Promise.all([getProfile(db, userId), hasWeight(db, userId)]);
  if (nextOnboardingStep({ profile, hasWeight: weighed }) === null) {
    await markOnboardingCompleted(db, userId);
    redirect("/accueil");
  }
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
  return continueOnboarding(db, user.userId);
}

/** Step 3: first weighing, dated today whatever the client sends (EF-ONB-01 CA2). */
export async function saveFirstWeightAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("onboarding");
  if (!user.profile) redirect("/onboarding");

  const todayDate = today(user.profile.timezone);
  const parsed = weightEntrySchema(todayDate).safeParse({
    ...Object.fromEntries(formData),
    date: todayDate,
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: keepValues(formData, "weight", "unit"),
    };
  }

  const { unit, ...entry } = parsed.data;
  const db = getDb();
  await db.transaction(async (tx) => {
    await upsertWeight(tx, user.userId, entry);
    // The kg/lb toggle sets the profile's display unit (specs/01 §3.1).
    await saveWeightUnit(tx, user.userId, unit);
  });
  return continueOnboarding(db, user.userId);
}
