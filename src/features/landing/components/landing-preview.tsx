import { Sparkline } from "@/features/dashboard/components/sparkline";
import { Silhouette } from "@/features/measurements/components/silhouette";
import { formatDecimal, formatWeeklyRate } from "@/lib/units";
import {
  PREVIEW_RATE_KG,
  PREVIEW_SPARKLINE,
  PREVIEW_TREND_KG,
  PREVIEW_ZONES,
} from "../preview-data";

/** What the app looks like, with invented data (it is a picture, not a screenshot to maintain). */
export function LandingPreview() {
  return (
    <figure
      aria-label="Aperçu de l'application"
      className="mx-auto grid max-w-3xl gap-8 rounded-2xl border border-line p-6 lg:grid-cols-[1fr_280px]"
    >
      <div>
        <p className="text-xs text-fg-2">Tendance du poids</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight" data-testid="preview-trend">
          {formatDecimal(PREVIEW_TREND_KG)}
          <span className="ml-1 text-lg font-normal text-muted">kg</span>
        </p>
        <p className="mt-1 text-sm text-positive">{formatWeeklyRate(PREVIEW_RATE_KG, "kg")}</p>
        <Sparkline data={PREVIEW_SPARKLINE} unit="kg" />
      </div>
      <Silhouette sex="female" zones={PREVIEW_ZONES} />
      <figcaption className="text-xs text-fg-2 lg:col-span-2">
        Exemple avec des données fictives.
      </figcaption>
    </figure>
  );
}
