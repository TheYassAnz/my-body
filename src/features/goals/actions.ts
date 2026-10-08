"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { goalReferenceKg, goalStatus } from "@/lib/metrics";
import { round2 } from "@/lib/units";
import { requireUser } from "@/lib/session";
import { archiveMessage } from "./copy";
import {
  createGoal,
  finishActiveGoal,
  getActiveGoal,
  replaceActiveGoal,
  updateActiveGoalTarget,
} from "./queries";
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
    const rawReferenceKg = goalReferenceKg(await listWeights(db, userId), todayDate);
    if (rawReferenceKg === null) {
      return { ok: false, formError: "Ajoute d'abord une pesée pour définir un objectif.", values };
    }

    // Validate against the value that gets stored, so the target is never equal to the start.
    const referenceKg = round2(rawReferenceKg);
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
      startWeightKg: referenceKg,
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

/**
 * EF-GOAL-04: closes a reached goal. The server recomputes the status itself:
 * the banner is only a hint. "maintain" starts a maintenance goal at today's trend,
 * "new" just ends the goal and lets the user pick another one.
 */
export async function achieveGoalAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await requireUser("app");
  const mode = String(formData.get("mode") ?? "");
  if (mode !== "maintain" && mode !== "new") return { ok: false, formError: GENERIC_ERROR };
  const todayDate = today(profile?.timezone ?? "Europe/Paris");

  try {
    const db = getDb();
    const [active, points] = await Promise.all([
      getActiveGoal(db, userId),
      listWeights(db, userId),
    ]);
    if (!active || goalStatus(active, points, todayDate).status !== "achieved") {
      return { ok: false, formError: "Ton objectif n'est pas encore atteint." };
    }
    if (mode === "maintain") {
      const referenceKg = goalReferenceKg(points, todayDate);
      if (referenceKg === null) return { ok: false, formError: GENERIC_ERROR };
      await replaceActiveGoal(
        db,
        userId,
        {
          type: "maintain",
          startDate: todayDate,
          startWeightKg: round2(referenceKg),
          targetWeightKg: null,
          weeklyRatePct: null,
        },
        "achieved",
        todayDate,
      );
    } else if (!(await finishActiveGoal(db, userId, "achieved", todayDate))) {
      return { ok: false, formError: GENERIC_ERROR };
    }
  } catch {
    // userId only: never the weights or the goal (specs/07 §8).
    console.error("achieve_goal_failed", { userId });
    return { ok: false, formError: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  if (mode === "new") redirect("/objectif");
  return { ok: true };
}
