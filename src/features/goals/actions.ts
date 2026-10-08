"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { listWeights } from "@/features/weight/queries";
import {
  confirmedReasons,
  fieldErrorsFrom,
  keepValues,
  type ActionResult,
  type ConfirmReason,
} from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { goalReferenceKg } from "@/lib/metrics";
import { round2 } from "@/lib/units";
import { requireUser } from "@/lib/session";
import { archiveMessage } from "./copy";
import { createGoal, getActiveGoal, replaceActiveGoal, updateActiveGoalTarget } from "./queries";
import { goalInputSchema } from "./schemas";

const FIELDS = ["type", "target", "rate", "unit"];
const GENERIC_ERROR = "Une erreur est survenue, réessaie.";
const CONCURRENT_ERROR = "Ton objectif vient déjà d'être enregistré. Recharge la page.";

/** SQLSTATE of a Postgres error, which Drizzle may wrap in `cause`. */
function sqlState(error: unknown): string | undefined {
  for (let e: unknown = error, i = 0; e && typeof e === "object" && i < 3; i++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}

/** EF-GOAL-01 and 02: creates the goal, updates its target and rate, or replaces it after a confirmation. */
export async function saveGoalAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await requireUser("app");
  const values = keepValues(formData, ...FIELDS);
  const todayDate = today(profile?.timezone ?? "Europe/Paris");

  try {
    const db = getDb();
    const referenceKg = goalReferenceKg(await listWeights(db, userId), todayDate);
    if (referenceKg === null) {
      return { ok: false, formError: "Ajoute d'abord une pesée pour définir un objectif.", values };
    }

    const parsed = goalInputSchema(referenceKg).safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };
    const { type, targetWeightKg, weeklyRatePct } = parsed.data;

    const active = await getActiveGoal(db, userId);
    if (active && active.type !== type) {
      const confirmed = confirmedReasons(formData);
      if (!confirmed.has("archive")) {
        const reason: ConfirmReason = "archive";
        return {
          ok: false,
          needsConfirmation: { reason, message: archiveMessage(active.type) },
          values: { ...values, confirmed: [...confirmed].join(",") },
        };
      }
    }

    const next = {
      type,
      startDate: todayDate,
      startWeightKg: round2(referenceKg),
      targetWeightKg,
      weeklyRatePct,
    };
    if (!active) {
      await createGoal(db, userId, next);
    } else if (active.type !== type) {
      await replaceActiveGoal(db, userId, next, "archived", todayDate);
    } else if (targetWeightKg !== null && weeklyRatePct !== null) {
      // Same type with a target: lose or gain only. Maintain and recomp carry none (goal_target_and_rate).
      if (!(await updateActiveGoalTarget(db, userId, { targetWeightKg, weeklyRatePct }))) {
        return { ok: false, formError: GENERIC_ERROR, values };
      }
    }
  } catch (error) {
    // userId and SQLSTATE only: never the weights, the target or the rate (specs/07 §8).
    const code = sqlState(error);
    console.error("save_goal_failed", { userId, code });
    return {
      ok: false,
      formError: code === "23505" ? CONCURRENT_ERROR : GENERIC_ERROR,
      values,
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
