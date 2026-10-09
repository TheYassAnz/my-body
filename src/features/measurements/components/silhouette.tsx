"use client";

import type { Zone } from "@/lib/metrics";
import {
  ANCHORS,
  BAND,
  HALF_PATH,
  HEAD,
  LABEL_SIDE,
  VIEW_BOX,
  VIEW_BOX_HEIGHT,
  VIEW_BOX_WIDTH,
  VIEW_BOX_X,
  type Sex,
} from "../silhouette-geometry";
import type { ZoneView } from "../summary";

const LEFT_RULE_END = 18;
const RIGHT_RULE_START = 186;

type Props = {
  sex: Sex;
  zones: readonly ZoneView[];
  /** When absent the silhouette is a plain picture: no buttons. */
  onSelect?: (zone: Zone) => void;
  /** Guided session: the zone being measured. */
  highlight?: Zone;
};

/**
 * Line-drawn silhouette (specs/06 §5). The SVG is decorative; the real controls are the
 * 44 px buttons laid over each anchor, labelled in full (ENF-12).
 */
export function Silhouette({ sex, zones, onSelect, highlight }: Props) {
  const anchors = ANCHORS[sex];
  const head = HEAD[sex];
  const path = HALF_PATH[sex];
  const band = highlight ? BAND[sex][highlight] : null;

  return (
    <div
      className={
        highlight ? "relative mx-auto h-full w-fit" : "relative mx-auto w-full max-w-[360px]"
      }
    >
      <svg
        viewBox={VIEW_BOX}
        aria-hidden="true"
        focusable="false"
        className={highlight ? "block h-full w-auto" : "block h-auto w-full"}
      >
        <g
          data-outline
          fill="none"
          strokeWidth={1.25}
          className="stroke-fg"
          opacity={highlight ? 0.3 : 1}
        >
          <ellipse cx={head.cx} cy={head.cy} rx={head.rx} ry={head.ry} />
          <path d={path} />
          <path d={path} transform="translate(200,0) scale(-1,1)" />
        </g>
        {highlight && band && (
          <rect
            data-highlight={highlight}
            x={band.x1}
            y={anchors[highlight].y - 8}
            width={band.x2 - band.x1}
            height={16}
            rx={8}
            className="fill-fg"
          />
        )}
        {!highlight &&
          zones.map((z) => {
            const { x, y } = anchors[z.zone];
            const left = LABEL_SIDE[z.zone] === "left";
            const edge = left ? LEFT_RULE_END : RIGHT_RULE_START;
            const textX = left ? edge - 4 : edge + 4;
            const measured = z.valueText !== null;
            return (
              <g key={z.zone}>
                <line x1={x} y1={y} x2={edge} y2={y} strokeWidth={1} className="stroke-line" />
                <circle
                  data-zone={z.zone}
                  data-measured={measured}
                  cx={x}
                  cy={y}
                  r={3.5}
                  strokeWidth={1.2}
                  className={measured ? "fill-fg stroke-fg" : "fill-bg stroke-fg"}
                />
                <text
                  x={textX}
                  y={y - 14}
                  textAnchor={left ? "end" : "start"}
                  fontSize={10}
                  className="fill-muted"
                >
                  {z.label}
                </text>
                <text
                  x={textX}
                  y={y}
                  textAnchor={left ? "end" : "start"}
                  fontSize={12.5}
                  fontWeight={600}
                  className="fill-fg"
                >
                  {z.valueText ?? "—"}
                </text>
                {z.deltaText && (
                  <text
                    x={textX}
                    y={y + 14}
                    textAnchor={left ? "end" : "start"}
                    fontSize={11}
                    className={z.tone === "positive" ? "fill-positive" : "fill-muted"}
                  >
                    {z.deltaText}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
      {onSelect &&
        !highlight &&
        zones.map((z) => {
          const { x, y } = anchors[z.zone];
          return (
            <button
              key={z.zone}
              type="button"
              aria-label={z.ariaLabel}
              onClick={() => onSelect(z.zone)}
              className="absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
              style={{
                left: `${((x - VIEW_BOX_X) / VIEW_BOX_WIDTH) * 100}%`,
                top: `${(y / VIEW_BOX_HEIGHT) * 100}%`,
              }}
            />
          );
        })}
    </div>
  );
}
