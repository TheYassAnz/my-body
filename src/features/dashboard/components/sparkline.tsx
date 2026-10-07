import { formatWeight, type WeightUnit } from "@/lib/units";
import { sparklineGeometry } from "../sparkline";
import type { Sparkline as SparklineData } from "../weight-summary";

const WIDTH = 320;
const HEIGHT = 72;

/** Server-rendered SVG, no client JavaScript (ENF-03). The label is the text summary (ENF-13). */
export function Sparkline({ data, unit }: { data: SparklineData; unit: WeightUnit }) {
  const g = sparklineGeometry(data, WIDTH, HEIGHT);
  const first = data.trend[0];
  const last = data.trend[data.trend.length - 1];
  const label =
    first && last
      ? `Tendance de ${formatWeight(first.trendKg, unit)} à ${formatWeight(last.trendKg, unit)} sur 3 mois`
      : "Aucune pesée sur les 3 derniers mois";
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      className="mt-5 h-auto w-full"
    >
      {g.dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={2.5} className="fill-dot" />
      ))}
      {g.trendPath && (
        <path
          d={g.trendPath}
          className="fill-none stroke-fg"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
