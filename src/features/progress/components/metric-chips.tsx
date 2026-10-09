import Link from "next/link";
import { ZONES } from "@/lib/metrics";
import { ZONE_LABELS } from "../../measurements/copy";
import { progressHref, type ProgressMetric } from "../params";

type Current = Parameters<typeof progressHref>[1];

export function MetricChips({ current, hasBodyFat }: { current: Current; hasBodyFat: boolean }) {
  const chips: { metric: ProgressMetric; label: string }[] = [
    { metric: "weight", label: "Poids" },
    ...(hasBodyFat ? [{ metric: "bodyFat" as const, label: "% MG" }] : []),
    ...ZONES.map((z) => ({ metric: z, label: ZONE_LABELS[z] })),
  ];
  return (
    <nav aria-label="Mesure" className="mt-4 flex gap-2 overflow-x-auto pb-1">
      {chips.map((c) => {
        const active = c.metric === current.metric;
        return (
          <Link
            key={c.metric}
            href={progressHref({ metric: c.metric, rows: 50 }, current)}
            aria-current={active ? "true" : undefined}
            className={`flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 text-[13px] font-medium ${active ? "bg-fg text-white" : "border border-line text-fg-2"}`}
          >
            {c.label}
          </Link>
        );
      })}
    </nav>
  );
}
