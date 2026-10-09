"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import {
  confirmedReasons,
  fieldErrorsFrom,
  keepValues,
  type ActionResult,
} from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";
import { replaceMessage } from "./copy";
import { getMeasureOn, upsertMeasure } from "./queries";
import { measureSchema } from "./schemas";

const FIELDS = ["date", "zone", "value", "unit"];

/**
 * "sheet": EF-MEA-03, any past date, confirmation before replacing.
 * "session": EF-MEA-02, always today's session, which re-edits its own values freely.
 */
async function save(formData: FormData, mode: "sheet" | "session"): Promise<ActionResult> {
  const { userId, profile } = await requireUser("app");
  const todayDate = today(profile?.timezone ?? "Europe/Paris");
  const values = keepValues(formData, ...FIELDS);
  const parsed = measureSchema(todayDate).safeParse({
    ...Object.fromEntries(formData),
    ...(mode === "session" ? { date: todayDate } : {}),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { date, zone, valueCm, unit } = parsed.data;
  const confirmed = confirmedReasons(formData);
  try {
    const db = getDb();
    if (mode === "sheet" && !confirmed.has("replace")) {
      const existing = await getMeasureOn(db, userId, date, zone);
      if (existing) {
        return {
          ok: false,
          needsConfirmation: {
            reason: "replace",
            message: replaceMessage(existing.valueCm, valueCm, unit),
          },
          values: { ...values, confirmed: [...confirmed].join(",") },
        };
      }
    }
    await upsertMeasure(db, userId, { date, zone, valueCm });
  } catch {
    // userId and action only: never the measure (specs/07 §8).
    console.error("save_measure_failed", { userId });
    return { ok: false, formError: "Une erreur est survenue, réessaie.", values };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveZoneAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return save(formData, "sheet");
}

export async function saveSessionZoneAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return save(formData, "session");
}
