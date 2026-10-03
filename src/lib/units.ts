const CM_PER_INCH = 2.54; // specs/03 §8

/**
 * One decimal, half away from zero (storage and display precision).
 * Shifts the decimal point in the string form ("168.45e1" = 1684.5 exactly)
 * because 168.45 * 10 is 1684.4999… in binary floating point.
 * Valid for the app's ranges (no exponent notation below 1e-6 or above 1e21).
 */
export function round1(value: number): number {
  const rounded = Math.round(Number(`${Math.abs(value)}e1`)) / 10;
  return value < 0 ? -rounded : rounded;
}

export const inToCm = (inches: number) => round1(inches * CM_PER_INCH);
export const cmToIn = (cm: number) => round1(cm / CM_PER_INCH);
