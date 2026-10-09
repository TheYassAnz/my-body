import Link from "next/link";
import { agoLabel, type MeasureBlockData } from "../summary";

const cta =
  "inline-flex h-11 items-center rounded-full bg-fg px-5 text-[13px] font-semibold text-white";

/** Accueil "Mensurations" block (specs/01 §3.2): formatting only, values come computed. */
export function MeasureBlock({ data }: { data: MeasureBlockData }) {
  if (data.state === "empty") {
    return (
      <section aria-labelledby="measure-title" className="mt-8">
        <h2 id="measure-title" className="text-[15px] font-semibold tracking-tight">
          Mensurations
        </h2>
        <p className="mt-2 text-sm text-fg-2">Mesure-toi une première fois</p>
        <Link href="/corps/seance" className={`mt-4 ${cta}`}>
          Commencer
        </Link>
      </section>
    );
  }

  const { zones, reminder } = data;
  const last = `Dernière séance ${agoLabel(reminder.daysSince as number)}`;
  return (
    <section aria-labelledby="measure-title" className="mt-8 flex flex-col gap-3">
      <h2 id="measure-title" className="text-xs font-medium text-fg-2">
        Mensurations
      </h2>
      <ul className="flex flex-col divide-y divide-line">
        {zones.map((z) => (
          <li key={z.zone} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="text-sm text-fg-2">{z.label}</span>
            <span className="text-[15px] font-semibold tabular-nums">{z.valueText ?? "—"}</span>
            <span
              className={`min-w-16 text-right text-sm tabular-nums ${z.tone === "positive" ? "text-positive" : "text-muted"}`}
            >
              {z.deltaText}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-fg-2">
        {reminder.nextLabel ? `${last} · Prochaine mesure : ${reminder.nextLabel}` : last}
      </p>
      {reminder.stale && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3">
          <p className="text-sm font-medium">Il est temps de te mesurer</p>
          <Link href="/corps/seance" className={cta}>
            Mesurer
          </Link>
        </div>
      )}
    </section>
  );
}
