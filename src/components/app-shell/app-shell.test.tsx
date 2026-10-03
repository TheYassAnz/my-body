// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/(app)/accueil/page";
import { isActive } from "./nav-links";

vi.mock("@/features/auth/actions", () => ({ resendVerificationAction: vi.fn() }));

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
