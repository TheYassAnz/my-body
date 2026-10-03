import { z } from "zod";

export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
      /** Submitted values to show again: React 19 resets forms after each submission. Never passwords. */
      values?: Record<string, string>;
    };

export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

export function fieldError(state: ActionResult | null, field: string): string | undefined {
  return state && !state.ok ? state.fieldErrors?.[field]?.[0] : undefined;
}

export function fieldValue(state: ActionResult | null, field: string): string | undefined {
  return state && !state.ok ? state.values?.[field] : undefined;
}

export function keepValues(formData: FormData, ...fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));
}
