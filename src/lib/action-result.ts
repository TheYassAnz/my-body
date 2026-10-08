// Type-only on purpose: client components import this file, and a runtime zod import would ship it to the browser.
import type { ZodError } from "zod";

/** Writes that need an explicit yes (EF-WGT-02, EF-WGT-03, EF-GOAL-02). */
export type ConfirmReason = "replace" | "suspicious" | "archive";
const CONFIRM_REASONS: readonly ConfirmReason[] = ["replace", "suspicious", "archive"];

export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
      /** Submitted values to show again: React 19 resets forms after each submission. Never passwords. */
      values?: Record<string, string>;
      /** Nothing was written: the client resubmits with `confirm=<reason>`. */
      needsConfirmation?: { reason: ConfirmReason; message: string };
    };

/**
 * Reasons the user already accepted: earlier ones (hidden `confirmed` field,
 * comma-separated) plus the confirmation button just pressed (`confirm`).
 */
export function confirmedReasons(formData: FormData): Set<ConfirmReason> {
  const raw = [
    ...String(formData.get("confirmed") ?? "").split(","),
    String(formData.get("confirm") ?? ""),
  ];
  return new Set(CONFIRM_REASONS.filter((r) => raw.includes(r)));
}

/** Same shape as zod's `flattenError().fieldErrors`: messages grouped by the first path segment. */
export function fieldErrorsFrom(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    if (issue.path.length === 0) continue;
    (fieldErrors[String(issue.path[0])] ??= []).push(issue.message);
  }
  return fieldErrors;
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
