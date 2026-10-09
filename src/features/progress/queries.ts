import { getActiveGoal } from "../goals/queries";
import { listMeasures } from "../measurements/queries";
import { listWeights } from "../weight/queries";
import type { Db } from "@/lib/db/types";

/** Everything the Progrès screen reads; series are cut per metric in `select-series.ts`. */
export async function loadProgress(db: Db, userId: string) {
  const [weights, measures, goal] = await Promise.all([
    listWeights(db, userId),
    listMeasures(db, userId),
    getActiveGoal(db, userId),
  ]);
  return { weights, measures, goal };
}
