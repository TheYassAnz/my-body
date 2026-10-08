// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActiveGoalSummary } from "../summary";
import { GoalBlock } from "./goal-block";

vi.mock("../actions", () => ({ achieveGoalAction: vi.fn() }));

afterEach(cleanup);

// Testing Library normalises whitespace (NNBSP included) to a plain space before matching.
const SP = " ";
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

describe("GoalBlock", () => {
  it("shows target, projection, progress and status for a loss goal", () => {
    render(<GoalBlock summary={active()} unit="kg" today="2026-10-07" />);
    const target = screen.getByText(`75,0${SP}kg`);
    expect(target.textContent).toBe("75,0\u202fkg");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe(
      "3,6 / 7,0\u202fkg",
    );
    expect(screen.getByTestId("goal-status").className).toContain("text-positive");
    expect(screen.getByText(/Atteinte estimée : ~ 15 nov\./)).toBeTruthy();
    expect(screen.getByText(`3,6 / 7,0${SP}kg`)).toBeTruthy();
    expect(screen.getByText("Dans le rythme.")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("51");
  });

  it("shows the calibration message and no projection while calibrating", () => {
    render(
      <GoalBlock
        summary={active({
          status: { status: "calibrating", missingEntries: 3, deviationKg: null, waist: null },
          projection: { kind: "unavailable" },
        })}
        unit="kg"
        today="2026-10-07"
      />,
    );
    expect(screen.getByText("Encore 3 pesées pour calculer ton rythme.")).toBeTruthy();
    expect(screen.queryByText(/Atteinte estimée/)).toBeNull();
    expect(screen.queryByText(/Non estimable/)).toBeNull();
    expect(screen.getByTestId("goal-status").className).toContain("text-fg-2");
  });

  it("shows the reference and no bar for a maintenance goal", () => {
    render(
      <GoalBlock
        summary={active({
          type: "maintain",
          targetKg: null,
          progress: null,
          projection: { kind: "unavailable" },
          status: { status: "stable", missingEntries: 0, deviationKg: 0.2, waist: null },
        })}
        unit="kg"
        today="2026-10-07"
      />,
    );
    expect(screen.getByText("Objectif · Maintien")).toBeTruthy();
    expect(screen.getByText("Stable, dans ta zone (± 1,5 %).")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("offers to set a goal when there is none (account created before L3, or after 'Nouvel objectif')", () => {
    render(<GoalBlock summary={{ state: "none" }} unit="kg" today="2026-10-07" />);
    expect(screen.getByRole("link", { name: "Définir mon objectif" }).getAttribute("href")).toBe(
      "/objectif",
    );
  });

  it("shows the banner with both choices when the goal is reached", () => {
    render(
      <GoalBlock
        summary={active({
          status: { status: "achieved", missingEntries: 0, deviationKg: null, waist: null },
        })}
        unit="kg"
        today="2026-10-07"
      />,
    );
    expect(screen.getByText(/Objectif atteint !/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Passer en maintien" }).getAttribute("value")).toBe(
      "maintain",
    );
    expect(screen.getByRole("button", { name: "Nouvel objectif" }).getAttribute("value")).toBe(
      "new",
    );
  });
});
