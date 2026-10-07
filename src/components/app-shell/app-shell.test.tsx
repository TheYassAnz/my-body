// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
});
