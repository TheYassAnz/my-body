"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { finishOnboardingAction } from "../actions";

/** Step 5: "Mesure-toi maintenant pour voir ta progression plus tard" (specs/01 §3.1). */
export function MeasureStep() {
  const [, action, pending] = useActionState(
    (prev: ActionResult | null, formData: FormData) => finishOnboardingAction(prev, formData),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-fg-2">
        Une première séance de mesure, c&apos;est ton point de départ : tu verras ensuite
        l&apos;écart zone par zone.
      </p>
      <Button type="submit" name="next" value="start" loading={pending}>
        Commencer (3 min)
      </Button>
      <Button type="submit" name="next" value="later" variant="secondary" loading={pending}>
        Plus tard
      </Button>
    </form>
  );
}
