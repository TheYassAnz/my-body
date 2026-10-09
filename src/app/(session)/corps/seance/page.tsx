import { getActiveGoal } from "@/features/goals/queries";
import { MeasureSession } from "@/features/measurements/components/measure-session";
import { listMeasures } from "@/features/measurements/queries";
import { buildSessionData } from "@/features/measurements/summary";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

export default async function MeasureSessionPage() {
  const { userId, profile } = await requireUser("app");
  const unit = profile?.lengthUnit ?? "cm";
  const db = getDb();
  const [measures, goal] = await Promise.all([listMeasures(db, userId), getActiveGoal(db, userId)]);
  const { zones, startIndex, firstTime } = buildSessionData(
    measures,
    unit,
    today(profile?.timezone ?? "Europe/Paris"),
  );
  return (
    <MeasureSession
      sex={profile?.sex ?? "male"}
      unit={unit}
      goal={goal?.type ?? null}
      zones={zones}
      startIndex={startIndex}
      intro={firstTime}
    />
  );
}
