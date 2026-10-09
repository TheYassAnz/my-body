"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { LengthUnit, WeightUnit } from "@/lib/units";
import { saveUnitsAction } from "../settings-actions";
import { RadioGroup } from "./settings-fields";

export function UnitsSettingsForm({
  defaults,
}: {
  defaults: { weightUnit: WeightUnit; lengthUnit: LengthUnit };
}) {
  const [state, action, pending] = useActionState(saveUnitsAction, null);
  const show = useToast();
  useEffect(() => {
    if (state?.ok) show("Unités enregistrées");
  }, [state, show]);

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
