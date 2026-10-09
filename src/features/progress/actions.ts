"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  confirmedReasons,
  fieldErrorsFrom,
  keepValues,
  type ActionResult,
  type ConfirmReason,
} from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { suspiciousDeviation, ZONES } from "@/lib/metrics";
import { requireUser } from "@/lib/session";
import { deleteMeasure, updateMeasureValue, upsertMeasure } from "@/features/measurements/queries";
import { MEASURE_MAX_CM, MEASURE_MIN_CM } from "@/features/measurements/limits";
import { measureSchema } from "@/features/measurements/schemas";
import { replaceMessage, suspiciousMessage } from "@/features/weight/copy";
import {
  BODY_FAT_MAX_PCT,
  BODY_FAT_MIN_PCT,
  MIN_DATE,
  NOTE_MAX_LENGTH,
  WEIGHT_MAX_KG,
  WEIGHT_MIN_KG,
} from "@/features/weight/limits";
import {
  deleteWeight,
  getWeightOn,
  listWeights,
  updateWeight,
  upsertWeight,
} from "@/features/weight/queries";
import { weightEntrySchema } from "@/features/weight/schemas";
import { GENERIC_ERROR, GONE_MEASURE, GONE_WEIGHT } from "./copy";

const WEIGHT_FIELDS = ["originalDate", "date", "weight", "unit", "bodyFat", "note"];
const MEASURE_FIELDS = ["originalDate", "zone", "value", "unit"];
const isoDate = z.iso.date();

/** What the client keeps to offer the undo: plain, serializable, no id. */
export type DeletedWeight = {
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  note: string | null;
};
export type DeletedMeasure = { date: string; zone: string; valueCm: number };
export type DeleteResult<T> = { ok: true; deleted: T } | { ok: false; formError: string };
export type RestoreResult = { ok: true } | { ok: false; formError: string };

/** EF-WGT-02/03: edits a weighing, date included, after the needed confirmations. */
export async function updateWeightAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await requireUser("app");
  const values = keepValues(formData, ...WEIGHT_FIELDS);
  const original = isoDate.safeParse(formData.get("originalDate"));
  if (!original.success) return { ok: false, formError: GONE_WEIGHT, values };
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
    if (entry.date !== original.data && !confirmed.has("replace")) {
      const taken = await getWeightOn(db, userId, entry.date);
      if (taken) return ask("replace", replaceMessage(taken.weightKg, entry.weightKg, unit));
    }
    if (!confirmed.has("suspicious")) {
      const others = (await listWeights(db, userId)).filter(
        (w) => w.date !== original.data && w.date !== entry.date,
      );
      const delta = suspiciousDeviation(others, entry.weightKg);
      if (delta !== null) return ask("suspicious", suspiciousMessage(entry.weightKg, delta, unit));
    }
    if ((await updateWeight(db, userId, original.data, entry)) === "missing") {
      return { ok: false, formError: GONE_WEIGHT, values };
    }
  } catch {
    // userId and action only: never the weight (specs/07 §8).
    console.error("update_weight_failed", { userId });
    return { ok: false, formError: GENERIC_ERROR, values };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** EF-MEA-04: edits the value only; the date is the one of the row being edited. */
export async function updateMeasureAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await requireUser("app");
  const values = keepValues(formData, ...MEASURE_FIELDS);
  const parsed = measureSchema(today(profile?.timezone ?? "Europe/Paris")).safeParse({
    ...Object.fromEntries(formData),
    date: formData.get("originalDate"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { date, zone, valueCm } = parsed.data;
  try {
    if ((await updateMeasureValue(getDb(), userId, date, zone, valueCm)) === "missing") {
      return { ok: false, formError: GONE_MEASURE, values };
    }
  } catch {
    console.error("update_measure_failed", { userId });
    return { ok: false, formError: GENERIC_ERROR, values };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** EF-WGT-04: deletes a weighing and returns it so the client can offer the undo. */
export async function deleteWeightAction(date: string): Promise<DeleteResult<DeletedWeight>> {
  const { userId } = await requireUser("app");
  const d = isoDate.safeParse(date);
  if (!d.success) return { ok: false, formError: GONE_WEIGHT };
  try {
    const row = await deleteWeight(getDb(), userId, d.data);
    if (!row) return { ok: false, formError: GONE_WEIGHT };
    revalidatePath("/", "layout");
    const { weightKg, bodyFatPct, note } = row;
    return { ok: true, deleted: { date: row.date, weightKg, bodyFatPct, note } };
  } catch {
    console.error("delete_weight_failed", { userId });
    return { ok: false, formError: GENERIC_ERROR };
  }
}

/** EF-MEA-04: deletes one measure (and its session when left empty). */
export async function deleteMeasureAction(
  date: string,
  zone: string,
): Promise<DeleteResult<DeletedMeasure>> {
  const { userId } = await requireUser("app");
  const d = isoDate.safeParse(date);
  const zoneParsed = z.enum(ZONES).safeParse(zone);
  if (!d.success || !zoneParsed.success) return { ok: false, formError: GONE_MEASURE };
  try {
    const row = await deleteMeasure(getDb(), userId, d.data, zoneParsed.data);
    if (!row) return { ok: false, formError: GONE_MEASURE };
    revalidatePath("/", "layout");
    return { ok: true, deleted: { date: row.date, zone: row.zone, valueCm: row.valueCm } };
  } catch {
    console.error("delete_measure_failed", { userId });
    return { ok: false, formError: GENERIC_ERROR };
  }
}

// The undo payload comes back from the browser: same bounds as a fresh entry, stored units.
const restoreWeightSchema = (todayDate: string) =>
  z.object({
    date: isoDate.refine((d) => d >= MIN_DATE && d <= todayDate),
    weightKg: z.number().min(WEIGHT_MIN_KG).max(WEIGHT_MAX_KG),
    bodyFatPct: z.number().min(BODY_FAT_MIN_PCT).max(BODY_FAT_MAX_PCT).nullable(),
    note: z
      .string()
      .refine((n) => [...n].length <= NOTE_MAX_LENGTH)
      .nullable(),
  });

const restoreMeasureSchema = (todayDate: string) =>
  z.object({
    date: isoDate.refine((d) => d >= MIN_DATE && d <= todayDate),
    zone: z.enum(ZONES),
    valueCm: z.number().min(MEASURE_MIN_CM).max(MEASURE_MAX_CM),
  });

/** Undo of a weighing deletion. */
export async function restoreWeightAction(entry: unknown): Promise<RestoreResult> {
  const { userId, profile } = await requireUser("app");
  const parsed = restoreWeightSchema(today(profile?.timezone ?? "Europe/Paris")).safeParse(entry);
  if (!parsed.success) return { ok: false, formError: GENERIC_ERROR };
  try {
    await upsertWeight(getDb(), userId, parsed.data);
  } catch {
    console.error("restore_weight_failed", { userId });
    return { ok: false, formError: GENERIC_ERROR };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Undo of a measure deletion: recreates the session if it had been removed. */
export async function restoreMeasureAction(row: unknown): Promise<RestoreResult> {
  const { userId, profile } = await requireUser("app");
  const parsed = restoreMeasureSchema(today(profile?.timezone ?? "Europe/Paris")).safeParse(row);
  if (!parsed.success) return { ok: false, formError: GENERIC_ERROR };
  try {
    await upsertMeasure(getDb(), userId, parsed.data);
  } catch {
    console.error("restore_measure_failed", { userId });
    return { ok: false, formError: GENERIC_ERROR };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
