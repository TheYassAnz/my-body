import { listMeasures } from "@/features/measurements/queries";
import { listWeights } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { measuresCsv, weightsCsv } from "./csv";

export const EXPORT_FILES = ["pesees", "mensurations"] as const;
export type ExportKind = (typeof EXPORT_FILES)[number];

export const isExportKind = (value: string): value is ExportKind =>
  (EXPORT_FILES as readonly string[]).includes(value);

/** Queries filter by userId: one user's file never holds another user's rows. */
export async function buildExport(db: Db, userId: string, kind: ExportKind): Promise<string> {
  return kind === "pesees"
    ? weightsCsv(await listWeights(db, userId))
    : measuresCsv(await listMeasures(db, userId));
}
