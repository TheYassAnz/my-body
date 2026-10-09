// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZONES } from "@/lib/metrics";
import type { ZoneView } from "../summary";
import { Silhouette } from "./silhouette";

afterEach(cleanup);

const zones: ZoneView[] = ZONES.map((zone) => ({
  zone,
  label: zone,
  valueText: zone === "waist" ? "84,5 cm" : null,
  deltaText: zone === "waist" ? "−3,5 cm" : null,
  tone: zone === "waist" ? "positive" : "neutral",
  ariaLabel:
    zone === "waist"
      ? "Taille : 84,5 cm, moins 3,5 cm sur 30 jours"
      : `${zone} : pas encore mesurée`,
}));

describe("Silhouette", () => {
  it("renders one accessible button per zone, named with the full label (ENF-12)", () => {
    render(<Silhouette sex="male" zones={zones} onSelect={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(8);
    expect(
      screen.getByRole("button", { name: "Taille : 84,5 cm, moins 3,5 cm sur 30 jours" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "neck : pas encore mesurée" })).toBeTruthy();
  });

  it("calls onSelect with the zone when a point is pressed", () => {
    const onSelect = vi.fn();
    render(<Silhouette sex="female" zones={zones} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /^Taille/ }));
    expect(onSelect).toHaveBeenCalledWith("waist");
  });

  it("makes every touch target at least 44 px (ENF-14)", () => {
    render(<Silhouette sex="male" zones={zones} onSelect={() => {}} />);
    for (const b of screen.getAllByRole("button")) expect(b.className).toContain("size-11");
  });

  it("hides the drawing from assistive technology: the buttons are the interface", () => {
    const { container } = render(<Silhouette sex="male" zones={zones} onSelect={() => {}} />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws a hollow point for a zone never measured and a filled one otherwise", () => {
    const { container } = render(<Silhouette sex="male" zones={zones} onSelect={() => {}} />);
    const dots = container.querySelectorAll("circle[data-zone]");
    expect(dots).toHaveLength(8);
    expect(
      container.querySelector('circle[data-zone="waist"]')?.getAttribute("data-measured"),
    ).toBe("true");
    expect(container.querySelector('circle[data-zone="neck"]')?.getAttribute("data-measured")).toBe(
      "false",
    );
  });

  it("shows the value and the delta of a measured zone, and a dash for the others", () => {
    render(<Silhouette sex="male" zones={zones} />);
    expect(screen.getByText("84,5 cm")).toBeTruthy();
    expect(screen.getByText("−3,5 cm")).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(7);
  });

  it("draws another outline for each sex", () => {
    const d = (sex: "male" | "female") => {
      const { container } = render(<Silhouette sex={sex} zones={zones} />);
      const path = container.querySelector("path")?.getAttribute("d");
      cleanup();
      return path;
    };
    expect(d("male")).not.toBe(d("female"));
  });

  it("has no buttons without onSelect", () => {
    render(<Silhouette sex="male" zones={zones} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("highlights the current zone with a bar and drops the annotations (guided session)", () => {
    const { container } = render(<Silhouette sex="male" zones={[]} highlight="waist" />);
    expect(container.querySelector('rect[data-highlight="waist"]')).toBeTruthy();
    expect(container.querySelectorAll("circle[data-zone]")).toHaveLength(0);
    expect(container.querySelector("g[data-outline]")?.getAttribute("opacity")).toBe("0.3");
  });
});
