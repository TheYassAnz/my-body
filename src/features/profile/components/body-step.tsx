"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, fieldValue } from "@/lib/action-result";
import { saveBodyAction } from "../actions";

export function BodyStep({
  defaults,
}: {
  defaults: { heightCm: number | null; birthDate: string | null };
}) {
  const [state, action, pending] = useActionState(saveBodyAction, null);
  const [unit, setUnit] = useState<"cm" | "in">("cm");

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="lengthUnit" value={unit} />
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label={`Taille (${unit})`}
            name="height"
            inputMode="decimal"
            defaultValue={fieldValue(state, "height") ?? defaults.heightCm ?? ""}
            error={fieldError(state, "height")}
          />
        </div>
        <div
          role="group"
          aria-label="Unité de longueur"
          className="flex h-11 rounded-xl bg-surface p-1 text-xs"
        >
          {(["cm", "in"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={`rounded-lg px-3 ${unit === u ? "bg-bg font-semibold text-fg" : "text-subtle"}`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      <Input
        label="Date de naissance"
        name="birthDate"
        type="date"
        defaultValue={fieldValue(state, "birthDate") ?? defaults.birthDate ?? ""}
        error={fieldError(state, "birthDate")}
      />
      <div className="flex gap-3">
        <Link
          href="/onboarding?etape=sex"
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
