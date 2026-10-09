"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/action-result";
import { REMINDER_NONE } from "../schemas";
import { saveReminderWeekdayAction } from "../settings-actions";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

export function ReminderSettingsForm({ defaults }: { defaults: { weekday: number | null } }) {
  const show = useToast();
  // Toast from the wrapper, not an effect: the revalidated render can unmount this form first.
  const [state, action, pending] = useActionState(
    async (prev: ActionResult | null, fd: FormData) => {
      const result = await saveReminderWeekdayAction(prev, fd);
      if (result.ok) show("Jour de mesure enregistré");
      return result;
    },
    null,
  );
  const id = useId();

  return (
    <form action={action} aria-label="Jour de mesure" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-xs font-medium text-fg-2">
          Jour de mesure conseillé
        </label>
        <select
          id={id}
          name="weekday"
          defaultValue={defaults.weekday === null ? REMINDER_NONE : String(defaults.weekday)}
          className="h-11 rounded-xl border border-line bg-surface px-3 text-sm text-fg"
        >
          <option value={REMINDER_NONE}>Aucun</option>
          {DAYS.map((label, index) => (
            <option key={label} value={String(index)}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-xs font-medium text-fg">
          {state.formError}
        </p>
      )}
      <Button type="submit" loading={pending} className="self-start">
        Enregistrer
      </Button>
    </form>
  );
}
