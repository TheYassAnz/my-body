import Link from "next/link";
import type { LocalDate } from "@/lib/dates";
import { formatDecimal, formatWeight, toDisplayWeight, type WeightUnit } from "@/lib/units";
import { GOAL_LABELS, projectionLabel, showsProjection, statusMessage } from "../copy";
import type { GoalSummary } from "../summary";
import { AchievedBanner } from "./achieved-banner";

/** Accueil "Objectif" block (specs/01 §3.2). Formatting only: values come computed. */
export function GoalBlock({
  summary,
  unit,
  today,
}: {
  summary: GoalSummary;
  unit: WeightUnit;
  today: LocalDate;
}) {
  if (summary.state === "none") {
    return (
      <section aria-labelledby="goal-title" className="mt-8">
        <h2 id="goal-title" className="text-[15px] font-semibold tracking-tight">
          Objectif
        </h2>
        <p className="mt-2 text-sm text-fg-2">Tu n&apos;as pas d&apos;objectif en cours.</p>
        <Link
          href="/objectif"
          className="mt-4 inline-flex h-11 items-center rounded-full bg-fg px-5 text-[13px] font-semibold text-white"
        >
          Définir mon objectif
        </Link>
      </section>
    );
  }

  const state = summary.status.status;
  const showProjection = showsProjection(state);
  const positive = state === "on_track" || state === "stable";
  const progressText = summary.progress
    ? `${formatDecimal(toDisplayWeight(summary.progress.doneKg, unit))} / ${formatWeight(summary.progress.totalKg, unit)}`
    : undefined;
  const percent = summary.progress ? Math.round(summary.progress.ratio * 100) : null;
  return (
    <section aria-labelledby="goal-title" className="mt-8 flex flex-col gap-3">
      {summary.status.status === "achieved" && <AchievedBanner />}
      <h2 id="goal-title" className="text-xs font-medium text-fg-2">
        Objectif · {GOAL_LABELS[summary.type]}
      </h2>
      {summary.targetKg !== null ? (
        <p className="flex items-baseline gap-2">
          <span className="text-[28px] font-semibold tracking-tight tabular-nums">
            {formatWeight(summary.targetKg, unit)}
          </span>
          {showProjection && (
            <span className="text-sm text-fg-2">{projectionLabel(summary.projection, today)}</span>
          )}
        </p>
      ) : (
        <p className="text-sm text-fg-2">Référence : {formatWeight(summary.startKg, unit)}</p>
      )}
      {summary.progress && percent !== null && (
        <>
          <div
            role="progressbar"
            aria-label="Progression vers l'objectif"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={progressText}
            className="h-[3px] w-full rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-fg" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-sm text-fg-2 tabular-nums">{progressText}</p>
        </>
      )}
      {state !== "achieved" && (
        <p
          data-testid="goal-status"
          className={`text-sm font-medium ${positive ? "text-positive" : "text-fg-2"}`}
        >
          {statusMessage(summary, unit)}
        </p>
      )}
    </section>
  );
}
