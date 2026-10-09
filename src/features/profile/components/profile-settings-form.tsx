"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { fieldError, fieldValue } from "@/lib/action-result";
import { formatInputDecimal, toDisplayLength, type LengthUnit } from "@/lib/units";
import type { Sex } from "../queries";
import { saveProfileSettingsAction } from "../settings-actions";
import { RadioGroup } from "./settings-fields";

export function ProfileSettingsForm({
  defaults,
}: {
  defaults: { sex: Sex; heightCm: number | null; birthDate: string | null; lengthUnit: LengthUnit };
}) {
  const [state, action, pending] = useActionState(saveProfileSettingsAction, null);
  const show = useToast();
  useEffect(() => {
    if (state?.ok) show("Profil enregistré");
  }, [state, show]);

  const height =
    defaults.heightCm === null
      ? ""
      : formatInputDecimal(toDisplayLength(defaults.heightCm, defaults.lengthUnit));

  return (
    <form action={action} aria-label="Profil" className="flex flex-col gap-4">
      <RadioGroup
        legend="Silhouette"
        name="sex"
        options={[
          ["female", "Femme"],
          ["male", "Homme"],
        ]}
        defaultValue={fieldValue(state, "sex") ?? defaults.sex}
        error={fieldError(state, "sex")}
      />
      <Input
        label={`Taille (${defaults.lengthUnit})`}
        name="height"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={fieldValue(state, "height") ?? height}
        error={fieldError(state, "height")}
      />
      <Input
        label="Date de naissance"
        name="birthDate"
        type="date"
        autoComplete="bday"
        defaultValue={fieldValue(state, "birthDate") ?? defaults.birthDate ?? ""}
        error={fieldError(state, "birthDate")}
      />
      <Button type="submit" loading={pending} className="self-start">
        Enregistrer
      </Button>
    </form>
  );
}
