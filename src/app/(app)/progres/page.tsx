import { getDb } from "@/lib/db/client";
import { today } from "@/lib/dates";
import { deltaTone } from "@/lib/metrics";
import { requireUser } from "@/lib/session";
import { ProgressView } from "@/features/progress/components/progress-view";
import { parseProgressParams } from "@/features/progress/params";
import { loadProgress } from "@/features/progress/queries";
import { selectSeries } from "@/features/progress/select-series";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; p?: string; n?: string }>;
}) {
  const { userId, profile } = await requireUser("app");
  const params = parseProgressParams(await searchParams);
  const data = await loadProgress(getDb(), userId);
  const weightUnit = profile?.weightUnit ?? "kg";
  const lengthUnit = profile?.lengthUnit ?? "cm";
  const view = selectSeries({
    data,
    metric: params.metric,
    period: params.period,
    today: today(profile?.timezone ?? "Europe/Paris"),
    weightUnit,
    lengthUnit,
  });
  // Neutral or green only, never red (spec 06): green when the change goes the goal's way.
  const v = view.series.stats.variation;
  const goalType = data.goal?.type;
  const positive =
    v !== null &&
    v !== 0 &&
    (view.metric === "weight"
      ? (goalType === "lose" && v < 0) || (goalType === "gain" && v > 0)
      : view.metric === "bodyFat"
        ? (goalType === "lose" || goalType === "recomp") && v < 0
        : deltaTone(view.metric, v, goalType ?? null) === "positive");

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Progrès</h1>
      <ProgressView
        metric={view.metric}
        period={view.period}
        rows={params.rows}
        hasBodyFat={view.hasBodyFat}
        series={view.series}
        weightUnit={weightUnit}
        lengthUnit={lengthUnit}
        positive={positive}
      />
    </>
  );
}
