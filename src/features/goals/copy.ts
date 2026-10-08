import type { GoalType } from "@/lib/metrics";

export const GOAL_LABELS: Record<GoalType, string> = {
  lose: "Perdre du poids",
  gain: "Prendre du poids",
  recomp: "Recomposition",
  maintain: "Maintien",
};

/** "Changer d'objectif archive « Perdre du poids » et en crée un nouveau. Continuer ?" */
export const archiveMessage = (from: GoalType) =>
  `Changer d'objectif archive « ${GOAL_LABELS[from]} » et en crée un nouveau. Continuer ?`;
