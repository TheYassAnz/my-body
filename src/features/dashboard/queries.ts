import { listWeights } from "@/features/weight/queries";
import type { LocalDate } from "@/lib/dates";
import type { Db } from "@/lib/db/types";
import { buildWeightSummary, type WeightSummary } from "./weight-summary";

/** Accueil data, computed server-side. L3 adds the goal, L4 the measurements. */
export type Dashboard = { weight: WeightSummary };

export async function getDashboard(
  db: Db,
  userId: string,
  todayDate: LocalDate,
): Promise<Dashboard> {
  return { weight: buildWeightSummary(await listWeights(db, userId), todayDate) };
}
