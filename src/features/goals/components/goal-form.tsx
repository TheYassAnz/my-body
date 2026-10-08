"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast";
import { fieldError, fieldValue, type ActionResult } from "@/lib/action-result";
import { formatShortDate, type LocalDate } from "@/lib/dates";
import {
  GOAL_RATES,
  exceedsRecommended,
  previewKgPerWeek,
  theoreticalDate,
  type GoalType,
  type RatedGoalType,
} from "@/lib/metrics";
import {
  formatDecimal,
  formatInputDecimal,
  KG_PER_LB,
  parseDecimal,
  toDisplayWeight,
  toStoredKg,
  type WeightUnit,
} from "@/lib/units";
import { WEIGHT_MAX_KG, WEIGHT_MIN_KG } from "@/features/weight/limits";
import { GOAL_DESCRIPTIONS, GOAL_LABELS, RATE_ALERTS } from "../copy";

const twoDecimals = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const TYPES: GoalType[] = ["lose", "gain", "recomp", "maintain"];
const isRated = (t: GoalType): t is RatedGoalType => t === "lose" || t === "gain";
/** "0,25 %/sem": two decimals, the step of the slider is 0,05. */
const pctLabel = (v: number) => `${String(v).replace(".", ",")} %/sem`;

export type GoalFormProps = {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  unit: WeightUnit;
  /** Current trend (latest weighing while calibrating), in kilograms. */
  referenceKg: number;
  today: LocalDate;
  active: { type: GoalType; targetKg: number | null; weeklyRatePct: number | null } | null;
  submitLabel: string;
  /** Extra buttons next to the submit button (onboarding: back link, "Juste suivre mon poids"). */
  extra?: ReactNode;
};

/** Goal editor shared by /objectif and onboarding step 4 (specs/01 §3.1 and §3.7). */
export function GoalForm({
  action,
  unit,
  referenceKg,
  today,
  active,
  submitLabel,
  extra,
}: GoalFormProps) {
  const toast = useToast();
  // A confirmation only covers what was submitted: editing anything voids it.
  const [edited, setEdited] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      setEdited(false);
      const result = await action(prev, formData);
      if (result.ok) toast("Objectif enregistré");
      return result;
    },
    null,
  );

  const [type, setType] = useState<GoalType>(active?.type ?? "lose");
  const [target, setTarget] = useState(
    active?.targetKg ? formatInputDecimal(toDisplayWeight(active.targetKg, unit)) : "",
  );
  const [rate, setRate] = useState(active?.weeklyRatePct ?? GOAL_RATES.lose.default);

  const rated = isRated(type);
  const targetKg = toStoredKg(parseDecimal(target), unit);
  const kgPerWeek = previewKgPerWeek(rate, referenceKg);
  // Same side rule as the server: a loss goes below the trend, a gain above it.
  const validTarget =
    rated &&
    Number.isFinite(targetKg) &&
    (type === "lose" ? targetKg < referenceKg : targetKg > referenceKg);
  const reachedOn = validTarget ? theoreticalDate(today, referenceKg, targetKg, kgPerWeek) : null;
  const previewId = useId();
  const rateErrorId = `${previewId}-rate-error`;
  const pace = `≈ ${twoDecimals.format(unit === "lb" ? kgPerWeek / KG_PER_LB : kgPerWeek)} ${unit}/sem`;
  const paceText = !validTarget
    ? pace
    : reachedOn
      ? `${pace} · atteinte vers le ${formatShortDate(reachedOn, today)}`
      : `${pace} · atteinte dans plus de 2 ans`;
  const confirmation = !edited && state && !state.ok ? state.needsConfirmation : undefined;
  const alert = rated && exceedsRecommended(type, rate) ? RATE_ALERTS[type] : null;

  const pickType = (next: GoalType) => {
    setType(next);
    setEdited(true);
    if (isRated(next)) setRate(GOAL_RATES[next].default);
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="unit" value={unit} />
      <input
        type="hidden"
        name="confirmed"
        value={edited ? "" : (fieldValue(state, "confirmed") ?? "")}
      />

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-2 text-xs font-medium text-fg-2">Type d&apos;objectif</legend>
        {TYPES.map((t) => (
          <label
            key={t}
            className="flex min-h-24 cursor-pointer flex-col gap-1 rounded-xl border border-line p-3 has-[:checked]:border-fg has-[:checked]:bg-fg has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]"
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => pickType(t)}
              className="sr-only"
            />
            <span className="text-[15px] font-semibold">{GOAL_LABELS[t]}</span>
            <span className="text-xs opacity-80">{GOAL_DESCRIPTIONS[t]}</span>
          </label>
        ))}
      </fieldset>
      {fieldError(state, "type") && (
        <p role="alert" className="text-xs font-medium text-fg">
          {fieldError(state, "type")}
        </p>
      )}

      <Input
        label="Actuel (tendance)"
        value={formatInputDecimal(toDisplayWeight(referenceKg, unit))}
        readOnly
      />

      {rated ? (
        <>
          <NumberStepper
            label="Cible"
            name="target"
            unit={unit}
            value={target}
            onChange={(v) => {
              setTarget(v);
              setEdited(true);
            }}
            min={toDisplayWeight(WEIGHT_MIN_KG, unit)}
            max={toDisplayWeight(WEIGHT_MAX_KG, unit)}
            fallback={toDisplayWeight(referenceKg, unit)}
            error={fieldError(state, "target")}
          />
          <Slider
            label="Rythme"
            name="rate"
            value={rate}
            onChange={(v) => {
              setRate(v);
              setEdited(true);
            }}
            min={GOAL_RATES[type].min}
            max={GOAL_RATES[type].max}
            step={0.05}
            zone={{ from: GOAL_RATES[type].recommendedMin, to: GOAL_RATES[type].recommendedMax }}
            format={pctLabel}
            describedBy={fieldError(state, "rate") ? `${previewId} ${rateErrorId}` : previewId}
          />
          {fieldError(state, "rate") && (
            <p id={rateErrorId} role="alert" className="text-xs font-medium text-fg">
              {fieldError(state, "rate")}
            </p>
          )}
          {alert && (
            <p className="rounded-xl bg-surface p-3 text-xs font-medium text-fg">{alert}</p>
          )}
          <p id={previewId} className="text-sm text-fg-2">
            {paceText}
          </p>
        </>
      ) : (
        <p className="rounded-xl bg-surface p-3 text-sm text-fg-2">
          Référence : ta tendance actuelle, {formatDecimal(toDisplayWeight(referenceKg, unit))}
          {" "}
          {unit}. Aucune cible ni rythme à choisir.
        </p>
      )}

      {confirmation ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-fg p-3">
          <p className="text-sm font-medium">{confirmation.message}</p>
          <Button type="submit" name="confirm" value={confirmation.reason} loading={pending}>
            Confirmer
          </Button>
        </div>
      ) : (
        <div className="flex gap-3">
          {extra}
          <Button type="submit" loading={pending} className="flex-[1.4]">
            {submitLabel}
          </Button>
        </div>
      )}
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-xs font-medium text-fg">
          {state.formError}
        </p>
      )}
    </form>
  );
}
