// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LandingPreview } from "./landing-preview";
import { Pillars } from "./pillars";

afterEach(cleanup);

describe("LandingPreview", () => {
  it("is a labelled figure that says the data is invented", () => {
    render(<LandingPreview />);
    const figure = screen.getByRole("figure", { name: /aperçu de l'application/i });
    expect(within(figure).getByText(/données fictives/i)).toBeTruthy();
  });

  it("shows the headline trend, the rate and the chart summary", () => {
    render(<LandingPreview />);
    expect(screen.getByTestId("preview-trend").textContent).toMatch(/79,8/);
    expect(screen.getByText(/−0,4/)).toBeTruthy();
    expect(screen.getByRole("img", { name: /tendance de .* à .* sur 3 mois/i })).toBeTruthy();
  });

  it("draws the silhouette as a plain picture: no zone buttons", () => {
    render(<LandingPreview />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("Pillars", () => {
  it("presents the three pillars as headings", () => {
    render(<Pillars />);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Tendance", "Silhouette", "Rythme"]);
  });
});
