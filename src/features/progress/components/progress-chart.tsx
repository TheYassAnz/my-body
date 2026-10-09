"use client";

import { CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { formatDecimal } from "@/lib/units";
import type { ProgressSeries } from "../build-series";
import { chartModel, tooltipInfo, type Row } from "./chart-model";

const tick = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const long = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

function Tip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  unit: string;
}) {
  const row = payload?.[0]?.payload;
  const info = row && tooltipInfo(row, unit);
  if (!active || !row || !info) return null;
  return (
    <div className="rounded-lg bg-fg px-3 py-2 text-xs text-white">
      <div>{long.format(row.t)}</div>
      <div className="font-semibold">{info.text}</div>
      {info.note ? <div>{info.note}</div> : null}
    </div>
  );
}

/** Weight = dots + trend; other metrics = linear line with dots (no smoothing). Spec 06 §4. */
export function ProgressChart({ series, unit }: { series: ProgressSeries; unit: string }) {
  const weight = series.trend !== undefined;
  const { data, end, proj, domain } = chartModel(series);

  return (
    <div aria-hidden="true" className="h-64 w-full lg:h-96">
      <ComposedChart responsive width="100%" height="100%" data={data} margin={{ right: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={[data[0].t, end]}
          tickFormatter={(v: number) => tick.format(v)}
          tick={{ fontSize: 11, fill: "var(--subtle)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          orientation="right"
          domain={domain}
          width={40}
          tick={{ fontSize: 11, fill: "var(--subtle)" }}
          tickFormatter={(v: number) => formatDecimal(v)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<Tip unit={unit} />} cursor={false} />
        {series.target !== undefined ? (
          <ReferenceLine
            ifOverflow="extendDomain"
            y={series.target}
            stroke="var(--fg)"
            strokeOpacity={0.5}
            strokeDasharray="2 5"
            label={{
              value: `${formatDecimal(series.target)} ${unit}`,
              fill: "var(--fg)",
              fontWeight: 600,
              fontSize: 11,
              position: "insideTopLeft",
            }}
          />
        ) : null}
        {weight ? (
          <>
            <Line
              dataKey="value"
              stroke="none"
              dot={{ r: 2.5, fill: "var(--dot)", stroke: "none" }}
              activeDot={{ r: 4, fill: "var(--fg)" }}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              dataKey="trend"
              type="monotone"
              stroke="var(--fg)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
          </>
        ) : (
          <Line
            dataKey="value"
            type="linear"
            stroke="var(--fg)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--fg)", stroke: "none" }}
            isAnimationActive={false}
            connectNulls
          />
        )}
        {proj.length ? (
          <Line
            data={proj}
            dataKey="proj"
            stroke="var(--fg)"
            strokeWidth={1.6}
            strokeDasharray="0.1 6"
            strokeLinecap="round"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            tooltipType="none"
          />
        ) : null}
      </ComposedChart>
    </div>
  );
}
