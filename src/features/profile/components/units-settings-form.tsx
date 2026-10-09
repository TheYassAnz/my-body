"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/action-result";
import type { LengthUnit, WeightUnit } from "@/lib/units";
import { saveUnitsAction } from "../settings-actions";
import { RadioGroup } from "./settings-fields";

export function UnitsSettingsForm({
  defaults,
}: {
  defaults: { weightUnit: WeightUnit; lengthUnit: LengthUnit };
}) {
  const show = useToast();
  // Toast from the wrapper, not an effect: the revalidated render can unmount this form first.
  const [state, action, pending] = useActionState(
    async (prev: ActionResult | null, fd: FormData) => {
      const result = await saveUnitsAction(prev, fd);
      if (result.ok) show("Unités enregistrées");
      return result;
    },
    null,
  );

  return (
    <form action={action} aria-label="Unités" className="flex flex-col gap-4">
      <RadioGroup
        legend="Poids"
        name="weightUnit"
        options={[
          ["kg", "kg"],
          ["lb", "lb"],
        ]}
        defaultValue={defaults.weightUnit}
      />
      <RadioGroup
        legend="Longueurs"
        name="lengthUnit"
        options={[
          ["cm", "cm"],
          ["in", "in"],
        ]}
        defaultValue={defaults.lengthUnit}
      />
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
