"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import {
  confirmedReasons,
  fieldErrorsFrom,
  keepValues,
  type ActionResult,
  type ConfirmReason,
} from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { suspiciousDeviation } from "@/lib/metrics";
import { requireUser } from "@/lib/session";
import { replaceMessage, suspiciousMessage } from "./copy";
import { getWeightOn, listWeights, upsertWeight } from "./queries";
import { weightEntrySchema } from "./schemas";

const FIELDS = ["date", "weight", "unit", "bodyFat", "note"];

/** EF-WGT-01 to 03: saves the weighing of a date, after the needed confirmations. */
export async function saveWeightAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await requireUser("app");
  const values = keepValues(formData, ...FIELDS);
  const parsed = weightEntrySchema(today(profile?.timezone ?? "Europe/Paris")).safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { unit, ...entry } = parsed.data;
  const confirmed = confirmedReasons(formData);
  const ask = (reason: ConfirmReason, message: string): ActionResult => ({
    ok: false,
    needsConfirmation: { reason, message },
    values: { ...values, confirmed: [...confirmed].join(",") },
  });

  try {
    const db = getDb();
    const existing = await getWeightOn(db, userId, entry.date);
    if (existing && !confirmed.has("replace")) {
      return ask("replace", replaceMessage(existing.weightKg, entry.weightKg, unit));
    }
    if (!confirmed.has("suspicious")) {
      const others = (await listWeights(db, userId)).filter((w) => w.date !== entry.date);
      const delta = suspiciousDeviation(others, entry.weightKg);
      if (delta !== null) return ask("suspicious", suspiciousMessage(entry.weightKg, delta, unit));
    }
    await upsertWeight(db, userId, entry);
  } catch {
    // userId and action only: never the weight (specs/07 §8).
    console.error("save_weight_failed", { userId });
    return { ok: false, formError: "Une erreur est survenue, réessaie.", values };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
