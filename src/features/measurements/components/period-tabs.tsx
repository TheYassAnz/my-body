import Link from "next/link";
import type { DeltaPeriod } from "@/lib/metrics";
import { PERIOD_OPTIONS } from "../summary";

/** 7 j · 30 j · 90 j · Début: plain links, so the choice survives a reload and needs no JS. */
export function PeriodTabs({ current }: { current: DeltaPeriod }) {
  return (
    <nav aria-label="Période" className="mt-4 flex gap-2">
      {PERIOD_OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <Link
            key={o.param}
            href={`/corps?periode=${o.param}`}
            aria-current={active ? "true" : undefined}
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-full px-4 text-[13px] font-medium ${active ? "bg-fg text-white" : "border border-line text-fg-2"}`}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
