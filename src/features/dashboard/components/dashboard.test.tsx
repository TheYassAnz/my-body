// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/weight/actions", () => ({ saveWeightAction: vi.fn() }));

import type { Sparkline } from "../weight-summary";
import { HomeHeader } from "./home-header";
import { WeightBlock } from "./weight-block";

afterEach(cleanup);

const sparkline: Sparkline = {
  from: "2026-07-06",
  to: "2026-10-03",
  dots: [{ date: "2026-10-03", weightKg: 78.4 }],
  trend: [
    { date: "2026-07-06", trendKg: 82 },
    { date: "2026-10-03", trendKg: 78.4 },
  ],
};
const hero = () => screen.getByTestId("weight-hero").textContent;

describe("HomeHeader", () => {
  it("shows the date and links to Réglages so mobile users can reach sign-out", () => {
    render(<HomeHeader date="2026-10-03" />);
    expect(screen.getByText("samedi 3 octobre")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Réglages" }).getAttribute("href")).toBe("/reglages");
    expect(screen.getByRole("button", { name: "+ Nouvelle pesée" })).toBeTruthy();
  });
});

describe("WeightBlock", () => {
  it("shows the trend, the weekly rate, today's weighing and a described sparkline", () => {
    render(
      <WeightBlock
        unit="kg"
        rateTone="neutral"
        summary={{
          state: "ready",
          trendKg: 78.43,
          todayKg: 78.9,
          rate: { kgPerWeek: -0.35, pctPerWeek: -0.45 },
          sparkline,
        }}
      />,
    );
    expect(hero()).toBe("78,4");
    expect(screen.getByText(/−0,4\skg\/sem/)).toBeTruthy();
    expect(screen.getByText(/Pesée du jour : 78,9\skg/)).toBeTruthy();
    expect(
      screen.getByRole("img", { name: /Tendance de 82,0\skg à 78,4\skg sur 3 mois/ }),
    ).toBeTruthy();
  });

  it("colours the pace line by tone: green toward the goal, grey otherwise, never red", () => {
    const summary = {
      state: "ready" as const,
      trendKg: 78.43,
      todayKg: null,
      rate: { kgPerWeek: -0.35, pctPerWeek: -0.45 },
      sparkline,
    };
    const { rerender } = render(<WeightBlock unit="kg" rateTone="positive" summary={summary} />);
    const line = () => screen.getByText(/kg\/sem/);
    expect(line().className).toContain("text-positive");
    rerender(<WeightBlock unit="kg" rateTone="neutral" summary={summary} />);
    expect(line().className).toContain("text-fg-2");
    expect(line().className).not.toContain("text-positive");
  });

  it("shows the last weighing and the remaining count while calibrating", () => {
    render(
      <WeightBlock
        unit="kg"
        rateTone="neutral"
        summary={{
          state: "calibrating",
          latest: { date: "2026-10-02", weightKg: 70.4 },
          todayKg: null,
          missingEntries: 6,
          sparkline,
        }}
      />,
    );
    expect(hero()).toBe("70,4");
    expect(screen.getByText("Tendance en calibrage · encore 6 pesées")).toBeTruthy();
    expect(screen.getByText("Pas encore de pesée aujourd'hui")).toBeTruthy();
    expect(screen.queryByText(/kg\/sem/)).toBeNull();
  });

  it("uses the singular for the last missing weighing", () => {
    render(
      <WeightBlock
        unit="kg"
        rateTone="neutral"
        summary={{
          state: "calibrating",
          latest: { date: "2026-10-03", weightKg: 70 },
          todayKg: 70,
          missingEntries: 1,
          sparkline,
        }}
      />,
    );
    expect(screen.getByText("Tendance en calibrage · encore 1 pesée")).toBeTruthy();
  });

  it("invites to log a first weighing when there is none", () => {
    render(<WeightBlock unit="kg" rateTone="neutral" summary={{ state: "empty" }} />);
    expect(screen.getByText("Aucune pesée pour l'instant.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ajouter ma première pesée" })).toBeTruthy();
  });

  it("displays pounds when the profile uses them", () => {
    render(
      <WeightBlock
        unit="lb"
        rateTone="neutral"
        summary={{ state: "ready", trendKg: 78.4, todayKg: null, rate: null, sparkline }}
      />,
    );
    expect(hero()).toBe("172,8");
  });
});
