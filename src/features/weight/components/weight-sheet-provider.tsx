"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import type { LocalDate } from "@/lib/dates";
import type { WeightUnit } from "@/lib/units";
import { WeightForm } from "./weight-form";

export type WeightSheetDefaults = {
  today: LocalDate;
  lastWeightKg: number | null;
  unit: WeightUnit;
};

const OpenContext = createContext<() => void>(() => {});

export const useOpenWeightSheet = () => useContext(OpenContext);

/** Owns the "Nouvelle pesée" sheet; any descendant can open it. The form remounts on each opening. */
export function WeightSheetProvider({
  defaults,
  children,
}: {
  defaults: WeightSheetDefaults;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openSheet = useCallback(() => setOpen(true), []);
  return (
    <OpenContext value={openSheet}>
      {children}
      <Sheet open={open} onOpenChange={setOpen} title="Nouvelle pesée">
        <WeightForm defaults={defaults} onSaved={() => setOpen(false)} />
      </Sheet>
    </OpenContext>
  );
}
