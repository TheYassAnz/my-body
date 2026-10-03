import type { ActionResult } from "@/lib/action-result";

export function FormError({ state }: { state: ActionResult | null }) {
  if (!state || state.ok || !state.formError) return null;
  return (
    <p role="alert" className="text-sm text-fg">
      {state.formError}
    </p>
  );
}
