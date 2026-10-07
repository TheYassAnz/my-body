const CM_PER_INCH = 2.54; // specs/03 §8
const KG_PER_LB = 0.45359237; // specs/03 §8
const MINUS = "−";
const NNBSP = " "; // narrow no-break space before units (specs/06 §7)

/**
 * Rounds half away from zero to `decimals` places.
 * Shifts the decimal point in the string form ("168.45e1" = 1684.5 exactly)
 * because 168.45 * 10 is 1684.4999… in binary floating point.
 * Tiny values return 0: their string form uses exponent notation ("1e-7e1" is NaN).
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  if (Math.abs(value) < 1e-6) return 0;
  const rounded = Math.round(Number(`${Math.abs(value)}e${decimals}`)) / 10 ** decimals;
  return value < 0 ? -rounded : rounded;
}

/** One decimal: centimetres, percentages and every displayed value. */
export const round1 = (value: number) => roundTo(value, 1);
/** Two decimals: stored kilograms. */
export const round2 = (value: number) => roundTo(value, 2);

export const inToCm = (inches: number) => round1(inches * CM_PER_INCH);
export const cmToIn = (cm: number) => round1(cm / CM_PER_INCH);

export type WeightUnit = "kg" | "lb";

// At most 4 integer digits: keeps values far from exponent notation.
const DECIMAL = /^\d{1,4}([.,]\d{1,3})?$/;

/** Parses a typed decimal ("78,4" or "78.4"); NaN for anything else. */
export function parseDecimal(raw: unknown): number {
  if (typeof raw !== "string") return Number.NaN;
  const s = raw.trim();
  return DECIMAL.test(s) ? Number(s.replace(",", ".")) : Number.NaN;
}

/** Typed weight → stored kilograms (2 decimals). */
export const toStoredKg = (value: number, unit: WeightUnit) =>
  round2(unit === "lb" ? value * KG_PER_LB : value);

/** Stored kilograms → display unit (1 decimal). */
export const toDisplayWeight = (kg: number, unit: WeightUnit) =>
  round1(unit === "lb" ? kg / KG_PER_LB : kg);

const oneDecimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const upToOneDecimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** "78,4": one decimal, French separator (specs/03 §8). */
export function formatDecimal(value: number): string {
  const r = round1(value);
  return (r < 0 ? MINUS : "") + oneDecimal.format(Math.abs(r));
}

/** Signed difference without a useless zero: "−3,5", "+1", "0". */
export function formatDelta(value: number): string {
  const r = round1(value);
  if (r === 0) return "0";
  return (r < 0 ? MINUS : "+") + upToOneDecimal.format(Math.abs(r));
}

/** "78,4 kg" or "172,8 lb" from stored kilograms. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${formatDecimal(toDisplayWeight(kg, unit))}${NNBSP}${unit}`;
}

/** "−0,4 kg/sem" from a weekly rate in kilograms. */
export function formatWeeklyRate(kgPerWeek: number, unit: WeightUnit): string {
  return `${formatDelta(toDisplayWeight(kgPerWeek, unit))}${NNBSP}${unit}/sem`;
}

/** Value written into a number field: "78,4" (no sign, no thousands separator). */
export function formatInputDecimal(value: number): string {
  return round1(value).toFixed(1).replace(".", ",");
}
