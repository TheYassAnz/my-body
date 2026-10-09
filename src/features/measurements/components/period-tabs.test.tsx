// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { parsePeriod } from "../summary";
import { PeriodTabs } from "./period-tabs";

afterEach(cleanup);

describe("PeriodTabs", () => {
  it("links each period and marks the active one", () => {
    render(<PeriodTabs current={90} />);
    const hrefs = ["7 j", "30 j", "90 j", "Début"].map((n) =>
      screen.getByRole("link", { name: n }).getAttribute("href"),
    );
    expect(hrefs).toEqual([
      "/corps?periode=7",
      "/corps?periode=30",
      "/corps?periode=90",
      "/corps?periode=debut",
    ]);
    expect(screen.getByRole("link", { name: "90 j" }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("link", { name: "7 j" }).getAttribute("aria-current")).toBeNull();
  });

  it.each([undefined, "nope"])("highlights 30 j for period %s", (raw) => {
    render(<PeriodTabs current={parsePeriod(raw)} />);
    expect(screen.getByRole("link", { name: "30 j" }).getAttribute("aria-current")).toBe("true");
    expect(screen.getAllByRole("link").filter((l) => l.hasAttribute("aria-current"))).toHaveLength(
      1,
    );
  });

  it("keeps a 44 px touch target", () => {
    render(<PeriodTabs current={30} />);
    expect(screen.getByRole("link", { name: "Début" }).className).toContain("min-h-11");
  });
});
