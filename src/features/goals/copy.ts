import { formatShortDate, type LocalDate } from "@/lib/dates";
import type { GoalType, Projection, RatedGoalType, WaistIndicator } from "@/lib/metrics";
import { formatDelta, toDisplayWeight, type WeightUnit } from "@/lib/units";
import type { ActiveGoalSummary } from "./summary";

export const GOAL_LABELS: Record<GoalType, string> = {
  lose: "Perdre du poids",
  gain: "Prendre du poids",
  recomp: "Recomposition",
  maintain: "Maintien",
};

/** "Changer d'objectif archive « Perdre du poids » et en crée un nouveau. Continuer ?" */
export const archiveMessage = (from: GoalType) =>
  `Changer d'objectif archive « ${GOAL_LABELS[from]} » et en crée un nouveau. Continuer ?`;

const NNBSP = " ";

export const GOAL_DESCRIPTIONS: Record<GoalType, string> = {
  lose: "Perdre du poids à un rythme choisi, jusqu'à une cible.",
  gain: "Prendre du poids progressivement, jusqu'à une cible.",
  recomp: "Garder le même poids en perdant du gras et en gagnant du muscle.",
  maintain: "Rester dans ta zone actuelle (± 1,5 %).",
};

/** Alert shown by the slider past the recommended zone (specs/03 §4). */
export const RATE_ALERTS: Record<RatedGoalType, string> = {
  lose: "Rythme agressif : risque accru de perte musculaire et de fatigue.",
  gain: "Rythme rapide : une part importante de la prise sera du gras.",
};

export const GOAL_DISCLAIMER =
  "my-body ne fournit pas de conseil médical. Consulte un professionnel de santé avant de débuter un régime.";

export const HISTORY_STATUS_LABELS = { achieved: "Atteint", archived: "Archivé" } as const;

const WAIST_MESSAGES: Record<WaistIndicator, string> = {
  waist_insufficient: "Mesure ta taille régulièrement pour suivre ta recompo.",
  waist_improving: "Tour de taille en baisse",
  waist_flat: "Tour de taille stable : patience, la recompo est lente.",
};

const signedKg = (deviationKg: number, unit: WeightUnit) =>
  `${formatDelta(toDisplayWeight(deviationKg, unit))}${NNBSP}${unit}`;

/** Message of the goal status (specs/03 §5), with the amounts in the user's unit. */
export function statusMessage(s: ActiveGoalSummary, unit: WeightUnit): string {
  const { status, missingEntries, deviationKg, waist } = s.status;
  switch (status) {
    case "calibrating":
      return `Encore ${missingEntries} ${missingEntries > 1 ? "pesées" : "pesée"} pour calculer ton rythme.`;
    case "achieved":
      return "Objectif atteint !";
    case "plateau":
      return "Plateau depuis 3 semaines. C'est normal de temps en temps. Si ça dure, ajuste ton alimentation ou ton activité.";
    case "wrong_direction":
      return s.type === "lose" ? "Ta tendance remonte." : "Ta tendance baisse.";
    case "too_fast":
      return s.type === "lose"
        ? "Trop rapide : risque de perte musculaire."
        : "Trop rapide : prise de gras probable.";
    case "too_slow":
      return "Plus lent que prévu.";
    case "on_track":
      return "Dans le rythme.";
    case "stable":
    case "out_of_band": {
      const gap = signedKg(deviationKg ?? 0, unit);
      if (s.type === "recomp" && waist) {
        const weight = status === "stable" ? "Poids stable" : `Poids hors zone : ${gap}`;
        return `${weight} · ${WAIST_MESSAGES[waist]}`;
      }
      return status === "stable" ? "Stable, dans ta zone (± 1,5 %)." : `Hors de ta zone : ${gap}`;
    }
  }
}

export function projectionLabel(p: Projection, today: LocalDate): string {
  if (p.kind === "estimated") return `Atteinte estimée : ~ ${formatShortDate(p.date, today)}`;
  if (p.kind === "too_far") return "Plus de 2 ans au rythme actuel";
  return "Non estimable pour l'instant";
}
