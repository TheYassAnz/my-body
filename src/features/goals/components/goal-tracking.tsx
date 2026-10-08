import { formatWeeklyRate } from "@/lib/units";
import type { LocalDate } from "@/lib/dates";
import type { WeightUnit } from "@/lib/units";
import { projectionLabel, statusMessage } from "../copy";
import type { ActiveGoalSummary } from "../summary";

/** "Suivi" block of /objectif: real pace over 4 weeks, status, explanation and projection (specs/01 §3.7). */
export function GoalTracking({
  summary,
  unit,
  today,
}: {
  summary: ActiveGoalSummary;
  unit: WeightUnit;
  today: LocalDate;
}) {
  return (
    <section aria-labelledby="tracking-title" className="rounded-xl border border-line p-4">
      <h2 id="tracking-title" className="text-[15px] font-semibold tracking-tight">
        Suivi
      </h2>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-fg-2">Rythme sur 4 semaines</dt>
          <dd className="font-semibold tabular-nums">
            {summary.rate ? formatWeeklyRate(summary.rate.kgPerWeek, unit) : "—"}
          </dd>
        </div>
        {summary.targetKg !== null && (
          <div className="flex justify-between gap-4">
            <dt className="text-fg-2">Projection</dt>
            <dd className="text-right">{projectionLabel(summary.projection, today)}</dd>
          </div>
        )}
      </dl>
      <p data-testid="goal-status" className="mt-3 text-sm font-medium">
        {statusMessage(summary, unit)}
      </p>
    </section>
  );
}
