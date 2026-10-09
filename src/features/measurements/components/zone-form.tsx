"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { useToast } from "@/components/ui/toast";
import { fieldError, fieldValue, type ActionResult } from "@/lib/action-result";
import type { LocalDate } from "@/lib/dates";
import type { Zone } from "@/lib/metrics";
import { toDisplayLength, type LengthUnit } from "@/lib/units";
import { saveZoneAction } from "../actions";
import { SAVED_TOAST } from "../copy";
import { MEASURE_MAX_CM, MEASURE_MIN_CM } from "../limits";
import type { SheetData } from "../summary";

const FALLBACK_CM = 60;

export function ZoneForm({
  zone,
  unit,
  today,
  data,
  onSaved,
}: {
  zone: Zone;
  unit: LengthUnit;
  today: LocalDate;
  data: SheetData;
  onSaved: () => void;
}) {
  const toast = useToast();
  // A confirmation only covers the date and value that were submitted: editing either voids it.
  const [edited, setEdited] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      setEdited(false);
      const result = await saveZoneAction(prev, formData);
      if (result.ok) {
        toast(SAVED_TOAST);
        onSaved();
      }
      return result;
    },
    null,
  );
  const [value, setValue] = useState(data.prefill ?? "");
  const confirmation = !edited && state && !state.ok ? state.needsConfirmation : undefined;

  return (
    <form action={action} className="mt-4 flex flex-col gap-5">
      <input type="hidden" name="zone" value={zone} />
      <input type="hidden" name="unit" value={unit} />
      <input
        type="hidden"
        name="confirmed"
        value={edited ? "" : (fieldValue(state, "confirmed") ?? "")}
      />
      {data.previousText && <p className="text-sm text-fg-2">{data.previousText}</p>}
      <Input
        label="Date"
        name="date"
        type="date"
        max={today}
        defaultValue={fieldValue(state, "date") ?? today}
        onChange={() => setEdited(true)}
        error={fieldError(state, "date")}
      />
      <NumberStepper
        label="Mesure"
        name="value"
        unit={unit}
        value={value}
        onChange={(v) => {
          setValue(v);
          setEdited(true);
        }}
        min={toDisplayLength(MEASURE_MIN_CM, unit)}
        max={toDisplayLength(MEASURE_MAX_CM, unit)}
        fallback={toDisplayLength(FALLBACK_CM, unit)}
        error={fieldError(state, "value")}
      />
      <div className="rounded-xl bg-surface p-3 text-xs text-fg-2">
        <p className="font-semibold text-fg">Comment mesurer</p>
        <p className="mt-1">{data.protocol}</p>
      </div>
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
