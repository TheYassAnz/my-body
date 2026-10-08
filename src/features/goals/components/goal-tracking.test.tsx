// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActiveGoalSummary } from "../summary";
import { GoalTracking } from "./goal-tracking";

vi.mock("../actions", () => ({ achieveGoalAction: vi.fn() }));

afterEach(cleanup);

const active = (over: Partial<ActiveGoalSummary> = {}): ActiveGoalSummary => ({
  state: "active",
  type: "lose",
  targetKg: 75,
  weeklyRatePct: 0.5,
  startKg: 82,
  startDate: "2026-09-01",
  referenceKg: 78.4,
  status: { status: "on_track", missingEntries: 0, deviationKg: null, waist: null },
  progress: { doneKg: 3.6, totalKg: 7, ratio: 3.6 / 7 },
  projection: { kind: "estimated", date: "2026-11-15", daysRemaining: 39 },
  rate: { kgPerWeek: -0.4, pctPerWeek: -0.5 },
  ...over,
});

describe("GoalTracking", () => {
  it("shows the projection and no banner while on track", () => {
    render(<GoalTracking summary={active()} unit="kg" today="2026-10-07" />);
    expect(screen.getByText(/Atteinte estimée : ~ 15 nov\./)).toBeTruthy();
    expect(screen.getByText("Dans le rythme.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Nouvel objectif" })).toBeNull();
  });

  it("hides the projection while calibrating", () => {
    render(
      <GoalTracking
        summary={active({
          status: { status: "calibrating", missingEntries: 3, deviationKg: null, waist: null },
          projection: { kind: "unavailable" },
        })}
        unit="kg"
        today="2026-10-07"
      />,
    );
    expect(screen.queryByText("Projection")).toBeNull();
    expect(screen.queryByText(/Non estimable/)).toBeNull();
  });

  it("shows the achieved banner, and neither projection nor duplicate status, once reached", () => {
    render(
      <GoalTracking
        summary={active({
          status: { status: "achieved", missingEntries: 0, deviationKg: null, waist: null },
          projection: { kind: "unavailable" },
        })}
        unit="kg"
        today="2026-10-07"
      />,
    );
    expect(screen.getByRole("button", { name: "Passer en maintien" })).toBeTruthy();
    expect(screen.queryByText(/Non estimable/)).toBeNull();
    expect(screen.queryByTestId("goal-status")).toBeNull();
  });
});
