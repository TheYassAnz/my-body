import { formatDelta, formatWeight, toDisplayWeight, type WeightUnit } from "@/lib/units";

export const WEIGHT_TIP =
  "Pèse-toi le matin, après les toilettes, avant de boire ou manger. Même balance, même endroit.";
export const NOTE_SUGGESTIONS = ["sel", "resto", "règles", "alcool", "mauvaise nuit"] as const;
export const SAVED_TOAST = "Pesée enregistrée";

/** "Remplacer 78,2 kg par 78,9 kg ?" (specs/01 §3.3) */
export const replaceMessage = (oldKg: number, newKg: number, unit: WeightUnit) =>
  `Remplacer ${formatWeight(oldKg, unit)} par ${formatWeight(newKg, unit)} ?`;

/** "72,0 kg ? C'est \u22126,4 kg par rapport à ta tendance. Confirmer ?" (specs/01 §3.3) */
export const suspiciousMessage = (kg: number, deltaKg: number, unit: WeightUnit) =>
  `${formatWeight(kg, unit)} ? C'est ${formatDelta(toDisplayWeight(deltaKg, unit))}\u202f${unit} par rapport à ta tendance. Confirmer ?`;
