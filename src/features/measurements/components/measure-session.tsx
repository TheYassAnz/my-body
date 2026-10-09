"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { deltaTone, measureDelta, type GoalType } from "@/lib/metrics";
import {
  formatLength,
  formatLengthDelta,
  parseDecimal,
  toDisplayLength,
  toStoredCm,
  type LengthUnit,
} from "@/lib/units";
import { saveSessionZoneAction } from "../actions";
import { GENERAL_RULES } from "../copy";
import { MEASURE_MAX_CM, MEASURE_MIN_CM } from "../limits";
import type { Sex } from "../silhouette-geometry";
import type { SessionZone } from "../summary";
import { Silhouette } from "./silhouette";

const FALLBACK_CM = 60;

type Screen = "intro" | "zone" | "recap";

/** Guided session (EF-MEA-02): each value is saved when moving on; quitting keeps what was saved. */
export function MeasureSession({
  sex,
  unit,
  goal,
  zones,
  startIndex,
  intro,
}: {
  sex: Sex;
  unit: LengthUnit;
  goal: GoalType | null;
  zones: SessionZone[];
  startIndex: number;
  intro: boolean;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>(intro ? "intro" : "zone");
  const [index, setIndex] = useState(startIndex);
  const [values, setValues] = useState(() => zones.map((z) => z.prefill));
  const [saved, setSaved] = useState(() => zones.map((z) => z.todayCm));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const zone = zones[index];
  const total = zones.length;

  const goTo = (i: number) => {
    setError(null);
    if (i >= total) setScreen("recap");
    else setIndex(Math.max(0, i));
  };

  const next = () => {
    const raw = values[index].trim();
    if (!raw) return goTo(index + 1); // nothing typed: same as skipping
    const formData = new FormData();
    formData.set("zone", zone.zone);
    formData.set("value", raw);
    formData.set("unit", unit);
    startTransition(async () => {
      const result = await saveSessionZoneAction(null, formData);
      if (!result.ok) {
        setError(
          result.fieldErrors?.value?.[0] ??
            result.formError ??
            "Une erreur est survenue, réessaie.",
        );
        return;
      }
      const cm = toStoredCm(parseDecimal(raw), unit);
      setSaved((s) => s.map((v, i) => (i === index ? cm : v)));
      goTo(index + 1);
    });
  };

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-[22px] pt-4 pb-6">
      {children}
    </div>
  );

  if (screen === "intro") {
    return shell(
      <>
        <header className="flex items-center justify-between">
          <Link href="/corps" className="flex min-h-11 items-center text-sm text-fg-2">
            ✕ Quitter
          </Link>
        </header>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Avant de commencer</h1>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-fg-2">
          {GENERAL_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <Button className="mt-8" onClick={() => setScreen("zone")}>
          Commencer
        </Button>
      </>,
    );
  }

  if (screen === "recap") {
    const done = zones.flatMap((z, i) =>
      saved[i] === null ? [] : [{ z, cm: saved[i] as number }],
    );
    return shell(
      <>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Récapitulatif</h1>
        {done.length === 0 ? (
          <p className="mt-4 text-sm text-fg-2">Aucune zone mesurée pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {done.map(({ z, cm }) => {
              const delta = z.previousCm === null ? null : measureDelta(z.previousCm, cm);
              const tone = deltaTone(z.zone, delta, goal);
              return (
                <li key={z.zone} className="flex items-baseline justify-between gap-3 py-3">
                  <span className="text-sm text-fg-2">{z.label}</span>
                  <span className="text-[15px] font-semibold tabular-nums">
                    {formatLength(cm, unit)}
                  </span>
                  <span
                    className={`text-sm ${tone === "positive" ? "text-positive" : "text-muted"}`}
                  >
                    {delta === null ? "première mesure" : formatLengthDelta(delta, unit)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <Button className="mt-8" onClick={() => router.push("/corps")}>
          Terminer
        </Button>
      </>,
    );
  }

  return shell(
    <>
      <header className="flex items-center justify-between">
        <Link href="/corps" className="flex min-h-11 items-center text-sm text-fg-2">
          ✕ Quitter
        </Link>
        <p className="text-sm font-semibold">Séance de mesure</p>
        <p className="text-sm text-fg-2 tabular-nums">
          {index + 1} / {total}
        </p>
      </header>
      <div
        role="progressbar"
        aria-label="Progression de la séance"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-valuetext={`Zone ${index + 1} sur ${total}`}
        className="mt-3 h-[3px] w-full rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-fg"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>
      <div className="mt-4 h-[34dvh]">
        <Silhouette sex={sex} zones={[]} highlight={zone.zone} />
      </div>
      <section className="mt-4 flex flex-col gap-4 rounded-t-[22px] bg-bg">
        <h2 className="text-[17px] font-semibold tracking-tight">{zone.label}</h2>
        {zone.previousText && <p className="-mt-2 text-sm text-fg-2">{zone.previousText}</p>}
        <NumberStepper
          label="Mesure"
          name="value"
          unit={unit}
          value={values[index]}
          onChange={(v) => setValues((vs) => vs.map((x, i) => (i === index ? v : x)))}
          min={toDisplayLength(MEASURE_MIN_CM, unit)}
          max={toDisplayLength(MEASURE_MAX_CM, unit)}
          fallback={toDisplayLength(FALLBACK_CM, unit)}
          error={error ?? undefined}
        />
        <div className="rounded-xl bg-surface p-3 text-xs text-fg-2">
          <p className="font-semibold text-fg">Comment mesurer</p>
          <p className="mt-1">{zone.protocol}</p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={index === 0 || pending}
            onClick={() => goTo(index - 1)}
          >
            ← Zone précédente
          </Button>
          <Button type="button" className="flex-1" loading={pending} onClick={next}>
            Zone suivante →
          </Button>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => goTo(index + 1)}
          className="min-h-11 text-sm text-fg-2 underline underline-offset-4 disabled:opacity-50"
        >
          Passer cette zone
        </button>
      </section>
    </>,
  );
}
