// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProgressSeries } from "../build-series";
import { ProgressView } from "./progress-view";

vi.mock("./progress-chart-lazy", () => ({ ProgressChartLazy: () => <div data-testid="chart" /> }));
vi.mock("../actions", () => ({}));
afterEach(cleanup);

const series: ProgressSeries = {
  points: [
    { date: "2026-09-01", value: 82 },
    { date: "2026-10-01", value: 78.4 },
  ],
  trend: [],
  stats: { variation: -3.6, secondary: { kind: "rate", value: -0.4 }, count: 2 },
  summary: "Tendance de 82,0 à 78,4 kg sur 3 mois, −0,4 kg/semaine",
};
const empty: ProgressSeries = {
  points: [],
  stats: { variation: null, secondary: { kind: "rate", value: null }, count: 0 },
  summary: "Aucune mesure sur cette période",
};
const base = {
  metric: "weight",
  period: "3m",
  rows: 50,
  hasBodyFat: false,
  series,
  weightUnit: "kg",
  lengthUnit: "cm",
  positive: true,
  history: { items: [] as never[], total: 0 },
  today: "2026-10-09",
} as const;

describe("ProgressView", () => {
  it("hides the % MG chip without body fat, shows it with", () => {
    render(<ProgressView {...base} />);
    expect(screen.queryByRole("link", { name: "% MG" })).toBeNull();
    cleanup();
    render(<ProgressView {...base} hasBodyFat />);
    expect(screen.getByRole("link", { name: "% MG" }).getAttribute("href")).toBe(
      "/progres?m=bodyFat&p=3m",
    );
  });

  it("marks the current metric and period", () => {
    render(<ProgressView {...base} />);
    expect(screen.getByRole("link", { name: "Poids" }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("link", { name: "3M" }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("link", { name: "1M" }).getAttribute("href")).toBe("/progres?p=1m");
  });

  it("shows the three stats and the ENF-13 summary", () => {
    render(<ProgressView {...base} />);
    expect(screen.getByText("Variation")).toBeTruthy();
    expect(screen.getByText("Rythme")).toBeTruthy();
    expect(screen.getByText("Mesures").nextSibling?.textContent).toBe("2");
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(series.summary);
    expect(screen.getByText(series.summary)).toBeTruthy();
  });

  it("shows an empty state with dashes", () => {
    render(<ProgressView {...base} series={empty} positive={false} />);
    expect(screen.queryByTestId("chart")).toBeNull();
    expect(screen.getByRole("link", { name: "Ajouter une mesure" })).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(document.body.textContent).not.toContain("NaN");
  });
});
