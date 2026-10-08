import { formatLongDate } from "@/lib/dates";
import { formatWeight, type WeightUnit } from "@/lib/units";
import { HISTORY_STATUS_LABELS, HISTORY_TYPE_LABELS } from "../copy";
import type { PastGoalSummary } from "../summary";

/** Collapsible list of achieved and archived goals (EF-GOAL-05). */
export function GoalHistory({ items, unit }: { items: PastGoalSummary[]; unit: WeightUnit }) {
  if (items.length === 0) return null;
  return (
    <details className="rounded-xl border border-line p-4">
      <summary className="min-h-11 cursor-pointer text-[15px] font-semibold">
        Historique des objectifs
      </summary>
      <ul data-testid="goal-history" className="mt-3 flex flex-col gap-3">
        {items.map((g) => (
          <li key={g.id} className="text-sm">
            <p className="font-medium">
              {HISTORY_TYPE_LABELS[g.type]} · {HISTORY_STATUS_LABELS[g.status]}
            </p>
            <p className="text-fg-2">
              Du {formatLongDate(g.startDate)} au {formatLongDate(g.endedAt)}
            </p>
            <p className="text-fg-2">
              {formatWeight(g.startKg, unit)} →{" "}
              {g.endKg === null ? "—" : formatWeight(g.endKg, unit)}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}
