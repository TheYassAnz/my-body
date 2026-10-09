// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MeasureBlockData, ZoneView } from "../summary";
import { MeasureBlock } from "./measure-block";

afterEach(cleanup);

const view = (
  zone: ZoneView["zone"],
  label: string,
  valueText: string | null,
  deltaText: string | null,
  tone: ZoneView["tone"] = "neutral",
): ZoneView => ({
  zone,
  label,
  valueText,
  deltaText,
  tone,
  ariaLabel: label,
});
const ready = (
  reminder: Partial<Extract<MeasureBlockData, { state: "ready" }>["reminder"]> = {},
): MeasureBlockData => ({
  state: "ready",
  zones: [
    view("waist", "Taille", "86,5 cm", "−3,5 cm", "positive"),
    view("hips", "Hanches", "100,0 cm", "−2 cm", "positive"),
    view("thigh", "Cuisse", null, null),
  ],
  reminder: {
    lastSessionDate: "2026-09-30",
    daysSince: 3,
    stale: false,
    nextLabel: null,
    ...reminder,
  },
});

describe("MeasureBlock", () => {
  it("invites a never-measured account to start", () => {
    render(<MeasureBlock data={{ state: "empty" }} />);
    expect(screen.getByText("Mesure-toi une première fois")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Commencer" }).getAttribute("href")).toBe(
      "/corps/seance",
    );
  });

  it("shows the three zones with value and delta, and a dash for an unmeasured one", () => {
    render(<MeasureBlock data={ready()} />);
    expect(screen.getByText("Taille")).toBeTruthy();
    expect(screen.getByText("86,5 cm")).toBeTruthy();
    expect(screen.getByText("−3,5 cm").className).toContain("text-positive");
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("shows when the last session was and when the next one is due", () => {
    render(<MeasureBlock data={ready({ nextLabel: "lundi" })} />);
    expect(screen.getByText("Dernière séance il y a 3 j · Prochaine mesure : lundi")).toBeTruthy();
    expect(screen.queryByText("Il est temps de te mesurer")).toBeNull();
  });

  it("says 'aujourd'hui' on the measure day", () => {
    render(<MeasureBlock data={ready({ nextLabel: "aujourd'hui" })} />);
    expect(screen.getByText(/Prochaine mesure : aujourd'hui/)).toBeTruthy();
  });

  it("omits the next measure when no day was chosen", () => {
    render(<MeasureBlock data={ready()} />);
    expect(screen.getByText("Dernière séance il y a 3 j")).toBeTruthy();
  });

  it("nudges after more than 14 days", () => {
    render(<MeasureBlock data={ready({ daysSince: 20, stale: true })} />);
    expect(screen.getByText("Il est temps de te mesurer")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mesurer" }).getAttribute("href")).toBe(
      "/corps/seance",
    );
  });
});
