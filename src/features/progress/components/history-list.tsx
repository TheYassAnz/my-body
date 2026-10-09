"use client";

import Link from "next/link";
import { useState } from "react";
import { ZONE_LABELS } from "../../measurements/copy";
import type { HistoryItem } from "../history-rows";
import { EditSheet } from "./edit-sheet";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function HistoryList({
  items,
  moreHref,
  today,
  weightUnit,
  lengthUnit,
}: {
  items: HistoryItem[];
  /** Null when everything is shown. A plain link: works without JavaScript. */
  moreHref: string | null;
  today: string;
  weightUnit: "kg" | "lb";
  lengthUnit: "cm" | "in";
}) {
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="history-title" className="mt-8">
      <h2 id="history-title" className="text-[15px] font-semibold tracking-tight">
        Historique
      </h2>
      <ul className="mt-2 divide-y divide-line">
        {items.map((item) => (
          <li key={item.kind === "measure" ? `${item.date}-${item.zone}` : item.date}>
            <button
              type="button"
              onClick={() => setSelected(item)}
              className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
            >
              <span className="text-sm text-fg-2">
                {dateFormat.format(new Date(`${item.date}T00:00:00Z`))}
              </span>
              <span className="flex items-center gap-2">
                {item.kind === "weight" && item.note && (
                  <span className="max-w-[10rem] truncate rounded-full border border-line px-2 py-0.5 text-xs text-fg-2">
                    {item.note}
                  </span>
                )}
                <span className="text-sm font-semibold tabular-nums">{item.label}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {moreHref && (
        <Link
          href={moreHref}
          scroll={false}
          className="mt-3 flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-[13px] font-semibold"
        >
          Charger plus
        </Link>
      )}
      {selected && (
        <EditSheet
          key={selected.kind === "measure" ? `${selected.date}-${selected.zone}` : selected.date}
          item={selected}
          today={today}
          weightUnit={weightUnit}
          lengthUnit={lengthUnit}
          zoneLabel={selected.kind === "measure" ? ZONE_LABELS[selected.zone] : ""}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
