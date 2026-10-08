"use server";

import "server-only";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, keepValues, type ActionResult } from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { sqlState } from "@/lib/db/errors";
import { createGoal, getActiveGoal } from "@/features/goals/queries";
import { goalInputSchema } from "@/features/goals/schemas";
import { hasWeight, listWeights, upsertWeight } from "@/features/weight/queries";
import { weightEntrySchema } from "@/features/weight/schemas";
import type { Db } from "@/lib/db/types";
import { goalReferenceKg } from "@/lib/metrics";
import { requireUser } from "@/lib/session";
import { round2 } from "@/lib/units";
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
  const [profile, weighed, goal] = await Promise.all([
    getProfile(db, userId),
    hasWeight(db, userId),
    getActiveGoal(db, userId),
  ]);
  if (nextOnboardingStep({ profile, hasWeight: weighed, hasGoal: goal !== null }) === null) {
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

/** Step 4: first goal. "Juste suivre mon poids" posts type=maintain with nothing else (EF-GOAL-01 CA1). */
export async function saveGoalStepAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("onboarding");
  if (!user.profile) redirect("/onboarding");

  const db = getDb();
  const todayDate = today(user.profile.timezone);
  const rawReferenceKg = goalReferenceKg(await listWeights(db, user.userId), todayDate);
  if (rawReferenceKg === null) redirect("/onboarding");

  // Validate against the value that gets stored, so the target is never equal to the start.
  const referenceKg = round2(rawReferenceKg);
  const parsed = goalInputSchema(referenceKg).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: keepValues(formData, "type", "target", "rate", "unit"),
    };
  }

  // Idempotent: a double submit or a back-and-forth never creates a second goal.
  try {
    if ((await getActiveGoal(db, user.userId)) === null) {
      const { type, targetWeightKg, weeklyRatePct } = parsed.data;
      await createGoal(db, user.userId, {
        type,
        startDate: todayDate,
        startWeightKg: referenceKg,
        targetWeightKg,
        weeklyRatePct,
      });
    }
  } catch (error) {
    const code = sqlState(error);
    // 23505: a concurrent submit created the goal first, which is what we wanted.
    if (code !== "23505") {
      // userId and SQLSTATE only: never the weights, the target or the rate (specs/07 §8).
      console.error("save_goal_step_failed", { userId: user.userId, code });
      return {
        ok: false,
        formError: "Une erreur est survenue, réessaie.",
        values: keepValues(formData, "type", "target", "rate", "unit"),
      };
    }
  }
  return continueOnboarding(db, user.userId);
}
