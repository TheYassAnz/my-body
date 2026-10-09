import { getDb } from "@/lib/db/client";
import { today } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { ProgressView } from "@/features/progress/components/progress-view";
import { buildHistory } from "@/features/progress/history-rows";
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
  const todayDate = today(profile?.timezone ?? "Europe/Paris");
  const view = selectSeries({
    data,
    metric: params.metric,
    period: params.period,
    today: todayDate,
    weightUnit,
    lengthUnit,
  });
  const history = buildHistory({
    data,
    metric: view.metric,
    rows: params.rows,
    weightUnit,
    lengthUnit,
  });
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
        positive={view.positive}
        history={history}
        today={todayDate}
      />
    </>
  );
}
