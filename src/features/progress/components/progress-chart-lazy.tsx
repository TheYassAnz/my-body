"use client";

import dynamic from "next/dynamic";

// Recharts stays out of the Accueil bundle (ENF-03): loaded on /progres only, never server-rendered.
export const ProgressChartLazy = dynamic(
  () => import("./progress-chart").then((m) => m.ProgressChart),
  { ssr: false, loading: () => <div className="h-64 w-full lg:h-96" /> },
);
