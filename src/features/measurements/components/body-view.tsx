"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import type { LocalDate } from "@/lib/dates";
import type { Zone } from "@/lib/metrics";
import type { LengthUnit } from "@/lib/units";
import type { Sex } from "../silhouette-geometry";
import type { SheetData, ZoneView } from "../summary";
import { Silhouette } from "./silhouette";
import { ZoneForm } from "./zone-form";

/** The silhouette plus the input sheet of the zone that was touched (EF-MEA-03). */
export function BodyView({
  sex,
  unit,
  today,
  zones,
  sheet,
}: {
  sex: Sex;
  unit: LengthUnit;
  today: LocalDate;
  zones: ZoneView[];
  sheet: Record<Zone, SheetData>;
}) {
  const [selected, setSelected] = useState<Zone | null>(null);
  return (
    <>
      <Silhouette sex={sex} zones={zones} onSelect={setSelected} />
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected ? sheet[selected].label : ""}
      >
        {selected && (
          <ZoneForm
            key={selected}
            zone={selected}
            unit={unit}
            today={today}
            data={sheet[selected]}
            onSaved={() => setSelected(null)}
          />
        )}
      </Sheet>
    </>
  );
}
