"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { WEIGHT_TIP } from "@/features/weight/copy";
import { WEIGHT_MAX_KG, WEIGHT_MIN_KG } from "@/features/weight/limits";
import { fieldError } from "@/lib/action-result";
import { formatLongDate, type LocalDate } from "@/lib/dates";
import {
  formatInputDecimal,
  parseDecimal,
  toDisplayWeight,
  toStoredKg,
  type WeightUnit,
} from "@/lib/units";
import { saveFirstWeightAction } from "../actions";

export function WeightStep({
  today,
  defaultUnit,
  defaultKg,
}: {
  today: LocalDate;
  defaultUnit: WeightUnit;
  defaultKg: number | null;
}) {
  const [state, action, pending] = useActionState(saveFirstWeightAction, null);
  const [unit, setUnit] = useState<WeightUnit>(defaultUnit);
  const [weight, setWeight] = useState(
    defaultKg === null ? "" : formatInputDecimal(toDisplayWeight(defaultKg, defaultUnit)),
  );

  // Converts the typed value so switching units never changes the weight.
  const switchUnit = (next: WeightUnit) => {
    if (next === unit) return;
    const typed = parseDecimal(weight);
    if (!Number.isNaN(typed)) {
      setWeight(formatInputDecimal(toDisplayWeight(toStoredKg(typed, unit), next)));
    }
    setUnit(next);
  };

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="unit" value={unit} />
      <p className="text-sm text-fg-2">Pesée du {formatLongDate(today)}</p>
      <NumberStepper
        label="Poids"
        name="weight"
        unit={unit}
        value={weight}
        onChange={setWeight}
        min={toDisplayWeight(WEIGHT_MIN_KG, unit)}
        max={toDisplayWeight(WEIGHT_MAX_KG, unit)}
        fallback={toDisplayWeight(70, unit)}
        error={fieldError(state, "weight")}
      />
      <div
        role="group"
        aria-label="Unité de poids"
        className="flex h-11 self-center rounded-xl bg-surface p-1 text-xs"
      >
        {(["kg", "lb"] as const).map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={unit === u}
            onClick={() => switchUnit(u)}
            className={`min-w-11 rounded-lg px-3 ${unit === u ? "bg-bg font-semibold text-fg" : "text-subtle"}`}
          >
            {u}
          </button>
        ))}
      </div>
      <p className="rounded-xl bg-surface p-3 text-xs text-fg-2">{WEIGHT_TIP}</p>
      <div className="flex gap-3">
        <Link
          href="/onboarding?etape=body"
          className="flex h-11 flex-1 items-center justify-center rounded-full border border-fg text-[13px] font-semibold"
        >
          Retour
        </Link>
        <Button type="submit" loading={pending} className="flex-[1.4]">
          Continuer
        </Button>
      </div>
    </form>
  );
}
