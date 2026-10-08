"use client";

import { useId } from "react";

export type SliderProps = {
  label: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Recommended range, highlighted on the track. */
  zone?: { from: number; to: number };
  format: (value: number) => string;
  describedBy?: string;
};

/** Native range input over a track that highlights the recommended zone (specs/01 §3.7). */
export function Slider({
  label,
  name,
  value,
  onChange,
  min,
  max,
  step,
  zone,
  format,
  describedBy,
}: SliderProps) {
  const id = useId();
  const pct = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const track = zone
    ? `linear-gradient(to right, var(--dot) 0 ${pct(zone.from)}, var(--positive) ${pct(zone.from)} ${pct(zone.to)}, var(--dot) ${pct(zone.to)} 100%)`
    : "var(--dot)";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs font-medium text-fg-2">
          {label}
        </label>
        <output htmlFor={id} className="text-sm font-semibold tabular-nums">
          {format(value)}
        </output>
      </div>
      <div className="relative flex h-11 items-center">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 h-1.5 rounded-full"
          style={{ background: track }}
        />
        <input
          id={id}
          name={name}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-describedby={describedBy}
          aria-valuetext={format(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider relative h-11 w-full"
        />
      </div>
    </div>
  );
}
