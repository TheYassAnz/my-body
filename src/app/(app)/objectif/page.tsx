import { GoalForm } from "@/features/goals/components/goal-form";
import { GoalHistory } from "@/features/goals/components/goal-history";
import { GoalTracking } from "@/features/goals/components/goal-tracking";
import { GOAL_DISCLAIMER } from "@/features/goals/copy";
import { saveGoalAction } from "@/features/goals/actions";
import { getActiveGoal, listPastGoals } from "@/features/goals/queries";
import { buildGoalHistory, buildGoalSummary } from "@/features/goals/summary";
import { listWeights } from "@/features/weight/queries";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { goalReferenceKg } from "@/lib/metrics";
import { requireUser } from "@/lib/session";

export default async function GoalPage() {
  const { userId, profile } = await requireUser("app");
  const todayDate = today(profile?.timezone ?? "Europe/Paris");
  const unit = profile?.weightUnit ?? "kg";
  const db = getDb();
  const [points, active, past] = await Promise.all([
    listWeights(db, userId),
    getActiveGoal(db, userId),
    listPastGoals(db, userId),
  ]);
  const referenceKg = goalReferenceKg(points, todayDate);
  const summary = buildGoalSummary(active, points, todayDate);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Mon objectif</h1>
      <div className="mt-6 flex flex-col gap-6">
        {referenceKg === null ? (
          <p className="text-sm text-fg-2">Ajoute une première pesée pour définir ton objectif.</p>
        ) : (
          <>
            {!active && (
              <p className="rounded-xl bg-surface p-3 text-sm text-fg-2">
                Tu n&apos;as pas d&apos;objectif en cours. Choisis-en un.
              </p>
            )}
            <GoalForm
              action={saveGoalAction}
              unit={unit}
              referenceKg={referenceKg}
              today={todayDate}
              active={
                active && {
                  type: active.type,
                  targetKg: active.targetWeightKg,
                  weeklyRatePct: active.weeklyRatePct,
                }
              }
              submitLabel="Enregistrer"
            />
          </>
        )}
        {summary.state === "active" && (
          <GoalTracking summary={summary} unit={unit} today={todayDate} />
        )}
        <GoalHistory items={buildGoalHistory(past, points)} unit={unit} />
        <p className="text-xs text-muted">{GOAL_DISCLAIMER}</p>
      </div>
    </>
  );
}
