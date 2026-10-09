"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GENERIC_ERROR } from "@/features/auth/messages";
import { fieldErrorsFrom, keepValues, type ActionResult } from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";
import { saveBodyInfo, saveReminderWeekday, saveSex, saveUnits } from "./queries";
import { bodyStepSchema, reminderSchema, sexStepSchema, unitsSchema } from "./schemas";

/** Units, sex and the reminder day show up on every screen: refresh the whole app. */
const refreshApp = () => revalidatePath("/", "layout");

/** The settings sections only exist once the profile does (the onboarding creates it). */
async function requireProfile() {
  const { userId, profile } = await requireUser("settings");
  if (!profile) redirect("/onboarding");
  return { userId, profile };
}

/** EF-SET-01: sex, height and birth date, with the onboarding's own rules. */
export async function saveProfileSettingsAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  const values = keepValues(formData, "sex", "height", "birthDate");

  const sex = sexStepSchema.shape.sex.safeParse(formData.get("sex"));
  // The height is typed in the unit the profile already displays.
  const body = bodyStepSchema(today(profile.timezone)).safeParse({
    height: formData.get("height"),
    lengthUnit: profile.lengthUnit,
    birthDate: formData.get("birthDate"),
  });
  if (!sex.success || !body.success) {
    return {
      ok: false,
      values,
      fieldErrors: {
        ...(sex.success ? {} : { sex: [sex.error.issues[0].message] }),
        ...(body.success ? {} : fieldErrorsFrom(body.error)),
      },
    };
  }

  await getDb().transaction(async (tx) => {
    await saveSex(tx, userId, sex.data, profile.timezone);
    await saveBodyInfo(tx, userId, body.data);
  });
  refreshApp();
  return { ok: true };
}

/** EF-SET-02: display units only; stored values stay metric. */
export async function saveUnitsAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const parsed = unitsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, formError: GENERIC_ERROR };

  await saveUnits(getDb(), userId, parsed.data);
  refreshApp();
  return { ok: true };
}

/** EF-SET-03: recommended measurement day, or none. */
export async function saveReminderWeekdayAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const parsed = reminderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, formError: GENERIC_ERROR };

  await saveReminderWeekday(getDb(), userId, parsed.data.weekday);
  refreshApp();
  return { ok: true };
}
