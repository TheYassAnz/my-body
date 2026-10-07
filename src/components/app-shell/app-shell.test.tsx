// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/(app)/accueil/page";
import { AppShell } from "./app-shell";
import { isActive } from "./nav-links";

vi.mock("@/features/auth/actions", () => ({ resendVerificationAction: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/accueil" }));
vi.mock("@/features/weight/actions", () => ({ saveWeightAction: vi.fn() }));

afterEach(cleanup);

describe("Accueil", () => {
  it("links to Réglages from the header so mobile users can reach sign-out", async () => {
    render(await HomePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "Réglages" }).getAttribute("href")).toBe("/reglages");
  });
});

describe("isActive", () => {
  it("matches the exact path and sub-paths only", () => {
    expect(isActive("/corps", "/corps")).toBe(true);
    expect(isActive("/corps/mesure", "/corps")).toBe(true);
    expect(isActive("/corps-extra", "/corps")).toBe(false);
  });
});

describe("AppShell", () => {
  it("opens the weighing sheet from the + tab", () => {
    render(
      <AppShell emailVerified weightSheet={{ today: "2026-10-03", lastWeightKg: 78.4, unit: "kg" }}>
        <p>page</p>
      </AppShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nouvelle pesée" }));
    expect(screen.getByRole("dialog", { name: "Nouvelle pesée" })).toBeTruthy();
  });

  it("has no + tab without weightSheet (settings before onboarding)", () => {
    render(
      <AppShell emailVerified>
        <p>page</p>
      </AppShell>,
    );
    expect(screen.queryByRole("button", { name: "Nouvelle pesée" })).toBeNull();
  });

  it("orders the tabs Accueil, Progrès, +, Corps, Objectif", () => {
    render(
      <AppShell emailVerified weightSheet={{ today: "2026-10-03", lastWeightKg: null, unit: "kg" }}>
        <p>page</p>
      </AppShell>,
    );
    const nav = screen.getAllByRole("navigation", { name: "Navigation principale" })[1];
    const labels = within(nav)
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(labels).toEqual(["Accueil", "Progrès", "Corps", "Objectif"]);
    const order = Array.from(nav.querySelectorAll("a, button")).map(
      (e) => e.getAttribute("aria-label") ?? e.textContent,
    );
    expect(order).toEqual(["Accueil", "Progrès", "Nouvelle pesée", "Corps", "Objectif"]);
  });
});
