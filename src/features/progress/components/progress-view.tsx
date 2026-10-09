import Link from "next/link";
import type { ProgressPeriod } from "@/lib/metrics";
import type { ProgressSeries } from "../build-series";
import type { ProgressMetric } from "../params";
import { MetricChips } from "./metric-chips";
import { PeriodSelector } from "./period-selector";
import { ProgressChartLazy } from "./progress-chart-lazy";
import { StatsRow } from "./stats-row";

export function ProgressView({
  metric,
  period,
  rows,
  hasBodyFat,
  series,
  weightUnit,
  lengthUnit,
  positive,
}: {
  metric: ProgressMetric;
  period: ProgressPeriod;
  rows: number;
  hasBodyFat: boolean;
  series: ProgressSeries;
  weightUnit: "kg" | "lb";
  lengthUnit: "cm" | "in";
  positive: boolean;
}) {
  const current = { metric, period, rows };
  const unit = metric === "weight" ? weightUnit : metric === "bodyFat" ? "%" : lengthUnit;
  return (
    <>
      <MetricChips current={current} hasBodyFat={hasBodyFat} />
      <PeriodSelector current={current} period={period} />
      {series.points.length === 0 ? (
        <div className="mt-6 text-sm text-fg-2">
          <p>{series.summary}.</p>
          <Link
            href={metric === "weight" || metric === "bodyFat" ? "/accueil" : "/corps/seance"}
            className="mt-4 inline-flex h-11 items-center rounded-full bg-fg px-5 text-[13px] font-semibold text-white"
          >
            Ajouter une mesure
          </Link>
        </div>
      ) : (
        <>
          <div role="img" aria-label={series.summary} className="mt-6">
            <ProgressChartLazy series={series} unit={unit} />
          </div>
          <p className="mt-2 text-sm text-fg-2">{series.summary}</p>
        </>
      )}
      <StatsRow
        stats={series.stats}
        metric={metric}
        weightUnit={weightUnit}
        lengthUnit={lengthUnit}
        positive={positive}
      />
    </>
  );
}
