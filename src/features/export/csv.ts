import type { MeasureRow } from "@/features/measurements/queries";
import type { WeightEntry } from "@/features/weight/queries";

export type Cell = string | number | null;

// specs/07 §6 lists = + - @ ; tab and carriage return are the other characters spreadsheets treat as formula starts.
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[;"\r\n]/;

/** Text starting like a formula gets an apostrophe; numbers (typed `number`) are never touched. */
export function csvCell(cell: Cell): string {
  if (cell === null) return "";
  if (typeof cell === "number") return String(cell);
  const safe = FORMULA_START.test(cell) ? `'${cell}` : cell;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** UTF-8 BOM (Excel), `;` separator, CRLF line ends (EF-SET-04 CA3). */
export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function weightsCsv(
  entries: readonly Pick<WeightEntry, "date" | "weightKg" | "bodyFatPct" | "note">[],
): string {
  return toCsv(
    ["date", "poids_kg", "masse_grasse_pct", "note"],
    entries.map((e) => [e.date, e.weightKg, e.bodyFatPct, e.note]),
  );
}

/** The zone column holds the stable enum key (waist, hips…), not a translated label. */
export function measuresCsv(rows: readonly MeasureRow[]): string {
  return toCsv(
    ["date", "zone", "valeur_cm"],
    rows.map((m) => [m.date, m.zone, m.valueCm]),
  );
}
