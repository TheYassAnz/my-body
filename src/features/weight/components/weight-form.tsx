"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { useToast } from "@/components/ui/toast";
import { fieldError, fieldValue, type ActionResult } from "@/lib/action-result";
import { formatInputDecimal, toDisplayWeight } from "@/lib/units";
import { saveWeightAction } from "../actions";
import { NOTE_SUGGESTIONS, SAVED_TOAST, WEIGHT_TIP } from "../copy";
import { NOTE_MAX_LENGTH, WEIGHT_MAX_KG, WEIGHT_MIN_KG } from "../limits";
import type { WeightSheetDefaults } from "./weight-sheet-provider";

const FALLBACK_KG = 70;

export function WeightForm({
  defaults,
  onSaved,
}: {
  defaults: WeightSheetDefaults;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { unit } = defaults;
  const [state, action, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await saveWeightAction(prev, formData);
      if (result.ok) {
        toast(SAVED_TOAST);
        onSaved();
      }
      return result;
    },
    null,
  );
  const [weight, setWeight] = useState(() =>
    defaults.lastWeightKg === null
      ? ""
      : formatInputDecimal(toDisplayWeight(defaults.lastWeightKg, unit)),
  );
  const [note, setNote] = useState("");
  const confirmation = state && !state.ok ? state.needsConfirmation : undefined;
  const addSuggestion = (s: string) =>
    setNote((n) => (n.trim() ? `${n.trim()}, ${s}` : s).slice(0, NOTE_MAX_LENGTH));

  return (
    <form action={action} className="mt-4 flex flex-col gap-5">
      <input type="hidden" name="unit" value={unit} />
      <input type="hidden" name="confirmed" value={fieldValue(state, "confirmed") ?? ""} />
      <Input
        label="Date"
        name="date"
        type="date"
        max={defaults.today}
        defaultValue={fieldValue(state, "date") ?? defaults.today}
        error={fieldError(state, "date")}
      />
      <NumberStepper
        label="Poids"
        name="weight"
        unit={unit}
        value={weight}
        onChange={setWeight}
        min={toDisplayWeight(WEIGHT_MIN_KG, unit)}
        max={toDisplayWeight(WEIGHT_MAX_KG, unit)}
        fallback={toDisplayWeight(FALLBACK_KG, unit)}
        error={fieldError(state, "weight")}
      />
      <Input
        label="% masse grasse (optionnel)"
        name="bodyFat"
        inputMode="decimal"
        defaultValue={fieldValue(state, "bodyFat") ?? ""}
        error={fieldError(state, "bodyFat")}
      />
      <div className="flex flex-col gap-2">
        <Input
          label="Note (optionnel)"
          name="note"
          maxLength={NOTE_MAX_LENGTH}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={fieldError(state, "note")}
        />
        <div className="flex flex-wrap gap-2">
          {NOTE_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addSuggestion(s)}
              className="min-h-11 rounded-full border border-line px-3 text-xs text-fg-2"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <p className="rounded-xl bg-surface p-3 text-xs text-fg-2">
        <span className="font-semibold text-fg">Conseil · </span>
        {WEIGHT_TIP}
      </p>
      {confirmation ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-fg p-3">
          <p className="text-sm font-medium">{confirmation.message}</p>
          <Button type="submit" name="confirm" value={confirmation.reason} loading={pending}>
            Confirmer
          </Button>
        </div>
      ) : (
        <Button type="submit" loading={pending}>
          Enregistrer
        </Button>
      )}
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-xs font-medium text-fg">
          {state.formError}
        </p>
      )}
    </form>
  );
}
