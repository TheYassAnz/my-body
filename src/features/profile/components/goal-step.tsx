"use client";

import Link from "next/link";
import { useActionState } from "react";
import { GoalForm, type GoalFormProps } from "@/features/goals/components/goal-form";
import { saveGoalStepAction } from "../actions";

type Props = Omit<GoalFormProps, "action" | "active" | "submitLabel" | "extra">;

/** Step 4: the goal form plus the discreet "Juste suivre mon poids" shortcut (specs/01 §3.1). */
export function GoalStep(props: Props) {
  return (
    <div className="flex flex-col gap-4">
      <GoalForm
        {...props}
        action={saveGoalStepAction}
        active={null}
        submitLabel="Terminer"
        extra={
          <Link
            href="/onboarding?etape=weight"
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-fg text-[13px] font-semibold"
          >
            Retour
          </Link>
        }
      />
      <SkipForm />
    </div>
  );
}

function SkipForm() {
  const [, action, pending] = useActionState(saveGoalStepAction, null);
  return (
    <form action={action} className="flex justify-center">
      <input type="hidden" name="type" value="maintain" />
      <input type="hidden" name="unit" value="kg" />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 px-3 text-sm text-fg-2 underline underline-offset-4 disabled:opacity-50"
      >
        Juste suivre mon poids
      </button>
    </form>
  );
}
