"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { fieldError } from "@/lib/action-result";
import { saveSexAction } from "../actions";

export function SexStep({ current }: { current: "male" | "female" | null }) {
  const [state, action, pending] = useActionState(saveSexAction, null);
  const timezoneInput = useRef<HTMLInputElement>(null);
  // Browser timezone, written straight to the DOM (no state); the server falls back to Europe/Paris if invalid.
  useEffect(() => {
    if (timezoneInput.current)
      timezoneInput.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);
  const error = fieldError(state, "sex");

  return (
    <form action={action} className="flex flex-col gap-6">
      <input ref={timezoneInput} type="hidden" name="timezone" defaultValue="Europe/Paris" />
      <fieldset className="flex flex-col gap-3" aria-describedby={error ? "sex-error" : undefined}>
        <legend className="mb-3 text-sm text-fg-2">Pour afficher la bonne silhouette.</legend>
        {(
          [
            ["female", "Femme"],
            ["male", "Homme"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex h-14 items-center gap-3 rounded-xl border border-line px-4 text-[15px] font-medium has-[:checked]:border-fg"
          >
            <input
              type="radio"
              name="sex"
              value={value}
              defaultChecked={current === value}
              className="accent-fg"
            />
            {label}
          </label>
        ))}
      </fieldset>
      {error && (
        <p id="sex-error" className="text-xs font-medium text-fg">
          {error}
        </p>
      )}
      <Button type="submit" loading={pending} className="w-full">
        Continuer
      </Button>
    </form>
  );
}
