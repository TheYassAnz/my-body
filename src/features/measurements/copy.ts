import { formatLength, type LengthUnit } from "@/lib/units";
import type { Zone } from "@/lib/metrics";

export const ZONE_LABELS: Record<Zone, string> = {
  neck: "Cou",
  shoulders: "Épaules",
  chest: "Poitrine",
  arm: "Bras",
  waist: "Taille",
  hips: "Hanches",
  thigh: "Cuisse",
  calf: "Mollet",
};

/** specs/03 §7. */
export const PROTOCOLS: Record<Zone, string> = {
  neck: "Juste sous la pomme d'Adam, ruban légèrement incliné vers l'avant. Regard droit, épaules relâchées.",
  shoulders:
    "Tour complet au point le plus large des épaules (deltoïdes), bras relâchés le long du corps.",
  chest:
    "Au niveau des mamelons, ruban horizontal passant sous les aisselles, en fin d'expiration normale.",
  arm: "Au point le plus large du biceps, bras relâché le long du corps, non contracté.",
  waist: "Au niveau du nombril, ventre relâché (ne pas le rentrer), en fin d'expiration normale.",
  hips: "Au point le plus large des fessiers, pieds joints, ruban horizontal.",
  thigh: "Au point le plus large, juste sous le pli fessier, poids réparti sur les deux jambes.",
  calf: "Au point le plus large du mollet, debout, poids réparti sur les deux jambes.",
};

/** Introduction screen of the guided session (specs/03 §7). */
export const GENERAL_RULES = [
  "Ruban souple non extensible, posé au contact de la peau, bien à plat, sans comprimer.",
  "Le matin, à jeun, après être passé aux toilettes, avant l'entraînement.",
  "Toujours le même côté du corps (par exemple le droit) pour les bras, cuisses et mollets.",
  "Muscles relâchés et posture droite. En cas de doute, mesure deux fois et garde la moyenne.",
  "Une fois toutes les 1 à 2 semaines, le même jour.",
] as const;

export const SAVED_TOAST = "Mesure enregistrée";

export function replaceMessage(oldCm: number, newCm: number, unit: LengthUnit): string {
  return `Remplacer ${formatLength(oldCm, unit)} par ${formatLength(newCm, unit)} ?`;
}
