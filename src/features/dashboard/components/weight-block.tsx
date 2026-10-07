import { NewWeightButton } from "@/features/weight/components/new-weight-button";
import {
  formatDecimal,
  formatWeeklyRate,
  formatWeight,
  toDisplayWeight,
  type WeightUnit,
} from "@/lib/units";
import type { WeightSummary } from "../weight-summary";
import { Sparkline } from "./sparkline";

export const calibrationMessage = (n: number) =>
  `Tendance en calibrage · encore ${n} ${n > 1 ? "pesées" : "pesée"}`;

/** Accueil "Poids" block (specs/01 §3.2). Formatting only: values come computed. */
export function WeightBlock({ summary, unit }: { summary: WeightSummary; unit: WeightUnit }) {
  if (summary.state === "empty") {
    return (
      <section aria-labelledby="weight-title" className="mt-8">
        <h2 id="weight-title" className="text-[15px] font-semibold tracking-tight">
          Poids
        </h2>
        <p className="mt-2 text-sm text-fg-2">Aucune pesée pour l&apos;instant.</p>
        <NewWeightButton className="mt-4" label="Ajouter ma première pesée" />
      </section>
    );
  }

  const calibrating = summary.state === "calibrating";
  const heroKg = calibrating ? summary.latest.weightKg : summary.trendKg;
  const paceLine = calibrating
    ? calibrationMessage(summary.missingEntries)
    : summary.rate && `${formatWeeklyRate(summary.rate.kgPerWeek, unit)} · rythme sur 4 semaines`;

  return (
    <section aria-labelledby="weight-title" className="mt-8">
      <h2 id="weight-title" className="text-xs font-medium text-fg-2">
        {calibrating ? "Poids · dernière pesée" : "Poids · tendance"}
      </h2>
      <p className="mt-1 flex items-baseline gap-1.5 font-semibold tabular-nums">
        <span
          data-testid="weight-hero"
          className="text-[64px] leading-none tracking-[-0.05em] lg:text-[88px]"
        >
          {formatDecimal(toDisplayWeight(heroKg, unit))}
        </span>
        <span className="text-[22px] text-muted">{unit}</span>
      </p>
      {paceLine && <p className="mt-3 text-sm text-fg-2">{paceLine}</p>}
      <p className="mt-1 text-sm text-fg-2">
        {summary.todayKg === null
          ? "Pas encore de pesée aujourd'hui"
          : `Pesée du jour : ${formatWeight(summary.todayKg, unit)}`}
      </p>
      <Sparkline data={summary.sparkline} unit={unit} />
    </section>
  );
}
