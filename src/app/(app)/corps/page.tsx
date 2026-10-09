import Link from "next/link";
import { getActiveGoal } from "@/features/goals/queries";
import { BodyView } from "@/features/measurements/components/body-view";
import { PeriodTabs } from "@/features/measurements/components/period-tabs";
import { listMeasures } from "@/features/measurements/queries";
import { buildBodySummary, parsePeriod } from "@/features/measurements/summary";
import { formatLongDate, today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

export default async function BodyPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { userId, profile } = await requireUser("app");
  const { periode } = await searchParams;
  const period = parsePeriod(periode);
  const todayDate = today(profile?.timezone ?? "Europe/Paris");
  const unit = profile?.lengthUnit ?? "cm";
  const db = getDb();
  const [measures, goal] = await Promise.all([listMeasures(db, userId), getActiveGoal(db, userId)]);
  const summary = buildBodySummary({
    measures,
    goal: goal?.type ?? null,
    period,
    unit,
    today: todayDate,
  });

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Corps</h1>
      <PeriodTabs current={period} />
      <div className="mt-6">
        <BodyView
          sex={profile?.sex ?? "male"}
          unit={unit}
          today={todayDate}
          zones={summary.zones}
          sheet={summary.sheet}
        />
      </div>
      <p className="mt-4 text-center text-sm text-fg-2">
        {summary.lastSessionDate
          ? `Dernière séance le ${formatLongDate(summary.lastSessionDate)}`
          : "Aucune séance pour l'instant"}
      </p>
      <div className="mt-6 flex justify-center">
        <Link
          href="/corps/seance"
          className="inline-flex h-11 items-center rounded-full bg-fg px-5 text-[13px] font-semibold text-white"
        >
          Nouvelle séance de mesure
        </Link>
      </div>
    </>
  );
}
