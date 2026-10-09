"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { formatInputDecimal, parseDecimal, round1 } from "@/lib/units";

export type NumberStepperProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  step?: number;
  min: number;
  max: number;
  /** Starting point for − / + when the field is empty. */
  fallback: number;
  error?: string;
};

const REPEAT_DELAY_MS = 400;
const REPEAT_EVERY_MS = 80;

/** Big centred number with − / + buttons; a long press repeats (specs/06 §3). */
export function NumberStepper({
  label,
  name,
  value,
  onChange,
  unit,
  step = 0.1,
  min,
  max,
  fallback,
  error,
}: NumberStepperProps) {
  const id = useId();
  const errorId = `${id}-error`;
  // Latest value for the repeat interval, which outlives a render.
  const valueRef = useRef(value);
  const timers = useRef<{
    delay?: ReturnType<typeof setTimeout>;
    repeat?: ReturnType<typeof setInterval>;
  }>({});

  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    const t = timers.current;
    return () => {
      clearTimeout(t.delay);
      clearInterval(t.repeat);
    };
  }, []);

  const bump = (direction: 1 | -1) => {
    const current = parseDecimal(valueRef.current);
    const base = Number.isNaN(current) ? fallback : current;
    const next = Math.min(max, Math.max(min, round1(base + direction * step)));
    valueRef.current = formatInputDecimal(next);
    onChange(valueRef.current);
  };
  const stop = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
  };
  const start = (direction: 1 | -1) => {
    stop();
    bump(direction);
    timers.current.delay = setTimeout(() => {
      timers.current.repeat = setInterval(() => bump(direction), REPEAT_EVERY_MS);
    }, REPEAT_DELAY_MS);
  };

  const stepButton = (direction: 1 | -1) => (
    <button
      type="button"
      aria-label={`${direction > 0 ? "Augmenter" : "Diminuer"} de ${formatInputDecimal(step)}`}
      onPointerDown={(e) => {
        if (e.button === 0) start(direction);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // Enter / Space fire a click with detail 0; pointer presses are handled above.
      onClick={(e) => {
        if (e.detail === 0) bump(direction);
      }}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-fg"
    >
      {direction > 0 ? (
        <Plus size={18} strokeWidth={1.7} aria-hidden />
      ) : (
        <Minus size={18} strokeWidth={1.7} aria-hidden />
      )}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <label htmlFor={id} className="text-xs font-medium text-fg-2">
        {label}
      </label>
      <div className="flex items-center gap-4">
        {stepButton(-1)}
        <div className="flex items-baseline gap-1">
          <input
            id={id}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="w-[5ch] bg-transparent text-center text-[44px] font-semibold tracking-[-0.05em] tabular-nums"
          />
          <span className="text-lg text-muted">{unit}</span>
        </div>
        {stepButton(1)}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-fg">
          {error}
        </p>
      )}
    </div>
  );
}
