"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { achieveGoalAction } from "../actions";

/** EF-GOAL-04: "Passer en maintien" or "Nouvel objectif"; both end the current goal. */
export function AchievedBanner() {
  const [state, action, pending] = useActionState(achieveGoalAction, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-fg p-4">
      <p className="text-[15px] font-semibold">🎯 Objectif atteint !</p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="mode" value="maintain" loading={pending}>
          Passer en maintien
        </Button>
        <Button type="submit" name="mode" value="new" variant="secondary" loading={pending}>
          Nouvel objectif
        </Button>
      </div>
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-xs font-medium text-fg">
          {state.formError}
        </p>
      )}
    </form>
  );
}
