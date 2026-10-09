import Link from "next/link";
import { PROGRESS_PERIODS, type ProgressPeriod } from "@/lib/metrics";
import { progressHref } from "../params";

type Current = Parameters<typeof progressHref>[1];

export function PeriodSelector({ current, period }: { current: Current; period: ProgressPeriod }) {
  return (
    <nav aria-label="Période" className="mt-3 flex gap-2">
      {PROGRESS_PERIODS.map((o) => (
        <Link
          key={o.param}
          href={progressHref({ period: o.param, rows: 50 }, current)}
          aria-current={o.param === period ? "true" : undefined}
          className={`flex min-h-11 min-w-11 items-center justify-center rounded-full px-4 text-[13px] font-medium ${o.param === period ? "bg-fg text-white" : "border border-line text-fg-2"}`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
