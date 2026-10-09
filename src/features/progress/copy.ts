import type { ProgressPeriod } from "@/lib/metrics";

/** Used after "sur" in the chart summary (ENF-13). */
export const PERIOD_PHRASES: Record<ProgressPeriod, string> = {
  "1m": "1 mois",
  "3m": "3 mois",
  "6m": "6 mois",
  "1a": "1 an",
  tout: "tout l'historique",
};

export const NO_DATA_SUMMARY = "Aucune mesure sur cette période";

export const GONE_WEIGHT = "Cette pesée n'existe plus.";
export const GONE_MEASURE = "Cette mesure n'existe plus.";
export const GENERIC_ERROR = "Une erreur est survenue, réessaie.";
