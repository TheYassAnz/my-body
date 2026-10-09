"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { fieldError, fieldValue, type ActionResult } from "@/lib/action-result";
import { formatInputDecimal, toDisplayLength, toDisplayWeight } from "@/lib/units";
import { MEASURE_MAX_CM, MEASURE_MIN_CM } from "../../measurements/limits";
import { NOTE_SUGGESTIONS } from "../../weight/copy";
import { NOTE_MAX_LENGTH, WEIGHT_MAX_KG, WEIGHT_MIN_KG } from "../../weight/limits";
import {
  deleteMeasureAction,
  deleteWeightAction,
  restoreMeasureAction,
  restoreWeightAction,
  updateMeasureAction,
  updateWeightAction,
} from "../actions";
import { MEASURE_DELETED, UNDO_MS, WEIGHT_DELETED } from "../copy";
import { exactLengthInput, exactWeightInput, type HistoryItem } from "../history-rows";

const SAVED = "Modification enregistrée";

type Props = {
  item: HistoryItem;
  today: string;
  weightUnit: "kg" | "lb";
  lengthUnit: "cm" | "in";
  zoneLabel: string;
  onClose: () => void;
};

export function EditSheet({ item, onClose, zoneLabel, ...rest }: Props) {
  const weighing = item.kind === "weight";
  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={weighing ? "Modifier la pesée" : `Modifier · ${zoneLabel}`}
    >
      {item.kind === "weight" ? (
        <WeightEditor item={item} unit={rest.weightUnit} today={rest.today} onDone={onClose} />
      ) : (
        <MeasureEditor item={item} unit={rest.lengthUnit} onDone={onClose} />
      )}
    </Sheet>
  );
}

/** Inline two-step delete; on success closes the sheet and offers the undo for 5 s. */
function DeleteButton({
  run,
  noun,
  onDone,
}: {
  run: () => Promise<
    { ok: true; undo: () => Promise<{ ok: boolean }> } | { ok: false; error: string }
  >;
  noun: "pesée" | "mesure";
  onDone: () => void;
}) {
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  // The button that had focus unmounts when the step changes: move focus to its replacement.
  useEffect(() => {
    if (mounted.current) {
      box.current
        ?.querySelector<HTMLButtonElement>(asking ? "[role=alert] button" : "button")
        ?.focus();
    }
    mounted.current = true;
  }, [asking]);
  const confirmDelete = () =>
    start(async () => {
      const result = await run();
      if (!result.ok) return setError(result.error);
      onDone();
      toast(noun === "pesée" ? WEIGHT_DELETED : MEASURE_DELETED, {
        durationMs: UNDO_MS,
        action: {
          label: "Annuler",
          onClick: () => {
            void result.undo().then((r) => {
              if (!r.ok) toast("Impossible d'annuler, réessaie.");
            });
          },
        },
      });
    });

  return (
    <div ref={box} className="mt-3 flex flex-col gap-3">
      {asking ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-fg p-3">
          <p className="text-sm font-medium">Supprimer cette {noun} ?</p>
          <Button type="button" loading={pending} onClick={confirmDelete}>
            Confirmer la suppression
          </Button>
          <button
            type="button"
            onClick={() => setAsking(false)}
            className="min-h-11 text-sm text-fg-2"
          >
            Garder
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="min-h-11 rounded-full border border-line text-[13px] font-semibold"
        >
          Supprimer
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-fg">
          {error}
        </p>
      )}
    </div>
  );
}

function WeightEditor({
  item,
  unit,
  today,
  onDone,
}: {
  item: Extract<HistoryItem, { kind: "weight" }>;
  unit: "kg" | "lb";
  today: string;
  onDone: () => void;
}) {
  const toast = useToast();
  // A confirmation only covers the date and weight that were submitted: editing either voids it.
  const [edited, setEdited] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      setEdited(false);
      const result = await updateWeightAction(prev, formData);
      if (result.ok) {
        toast(SAVED);
        onDone();
      }
      return result;
    },
    null,
  );
  const initial = formatInputDecimal(toDisplayWeight(item.weightKg, unit));
  const [weight, setWeight] = useState(initial);
  const [note, setNote] = useState(item.note ?? "");
  const confirmation = !edited && state && !state.ok ? state.needsConfirmation : undefined;
  const addSuggestion = (s: string) =>
    setNote((n) => (n.trim() ? `${n.trim()}, ${s}` : s).slice(0, NOTE_MAX_LENGTH));

  return (
    <>
      <form action={action} className="mt-4 flex flex-col gap-5">
        <input type="hidden" name="originalDate" value={item.date} />
        <input type="hidden" name="unit" value={unit} />
        {/* Untouched field: send the exact stored weight, the 1-decimal display would alter it. */}
        <input
          type="hidden"
          name="weight"
          value={weight === initial ? exactWeightInput(item.weightKg, unit) : weight}
        />
        <input
          type="hidden"
          name="confirmed"
          value={edited ? "" : (fieldValue(state, "confirmed") ?? "")}
        />
        <Input
          label="Date"
          name="date"
          type="date"
          max={today}
          defaultValue={fieldValue(state, "date") ?? item.date}
          onChange={() => setEdited(true)}
          error={fieldError(state, "date")}
        />
        <NumberStepper
          label="Poids"
          name="displayWeight"
          unit={unit}
          value={weight}
          onChange={(v) => {
            setWeight(v);
            setEdited(true);
          }}
          min={toDisplayWeight(WEIGHT_MIN_KG, unit)}
          max={toDisplayWeight(WEIGHT_MAX_KG, unit)}
          fallback={toDisplayWeight(item.weightKg, unit)}
          error={fieldError(state, "weight")}
        />
        <Input
          label="% masse grasse (optionnel)"
          name="bodyFat"
          inputMode="decimal"
          defaultValue={
            fieldValue(state, "bodyFat") ??
            (item.bodyFatPct === null ? "" : formatInputDecimal(item.bodyFatPct))
          }
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
      <DeleteButton
        noun="pesée"
        onDone={onDone}
        run={async () => {
          const r = await deleteWeightAction(item.date);
          return r.ok
            ? { ok: true, undo: () => restoreWeightAction(r.deleted) }
            : { ok: false, error: r.formError };
        }}
      />
    </>
  );
}

/** EF-MEA-04: only the value changes; zone and date are read-only. */
function MeasureEditor({
  item,
  unit,
  onDone,
}: {
  item: Extract<HistoryItem, { kind: "measure" }>;
  unit: "cm" | "in";
  onDone: () => void;
}) {
  const toast = useToast();
  const [state, action, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await updateMeasureAction(prev, formData);
      if (result.ok) {
        toast(SAVED);
        onDone();
      }
      return result;
    },
    null,
  );
  const initial = formatInputDecimal(toDisplayLength(item.valueCm, unit));
  const [value, setValue] = useState(initial);

  return (
    <>
      <p className="mt-2 text-sm text-fg-2">
        {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(
          new Date(`${item.date}T00:00:00Z`),
        )}
      </p>
      <form action={action} className="mt-4 flex flex-col gap-5">
        <input type="hidden" name="originalDate" value={item.date} />
        <input type="hidden" name="zone" value={item.zone} />
        <input type="hidden" name="unit" value={unit} />
        {/* Untouched field: send the exact stored value, the 1-decimal display would alter it. */}
        <input
          type="hidden"
          name="value"
          value={value === initial ? exactLengthInput(item.valueCm, unit) : value}
        />
        <NumberStepper
          label="Mesure"
          name="displayValue"
          unit={unit}
          value={value}
          onChange={setValue}
          min={toDisplayLength(MEASURE_MIN_CM, unit)}
          max={toDisplayLength(MEASURE_MAX_CM, unit)}
          fallback={toDisplayLength(item.valueCm, unit)}
          error={fieldError(state, "value")}
        />
        <Button type="submit" loading={pending}>
          Enregistrer
        </Button>
        {state && !state.ok && state.formError && (
          <p role="alert" className="text-xs font-medium text-fg">
            {state.formError}
          </p>
        )}
      </form>
      <DeleteButton
        noun="mesure"
        onDone={onDone}
        run={async () => {
          const r = await deleteMeasureAction(item.date, item.zone);
          return r.ok
            ? { ok: true, undo: () => restoreMeasureAction(r.deleted) }
            : { ok: false, error: r.formError };
        }}
      />
    </>
  );
}
