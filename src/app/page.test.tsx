// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ getSession: vi.fn(), redirect: vi.fn() }));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    ctx.redirect(url);
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession: ctx.getSession } }) }));

import HomePage from "./page";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("public home page", () => {
  it("sends a signed-in visitor to the app", async () => {
    ctx.getSession.mockResolvedValue({ user: { id: "alice" } });
    await expect(HomePage()).rejects.toThrow("redirect:/accueil");
    expect(ctx.redirect).toHaveBeenCalledWith("/accueil");
  });

  it("shows the landing page to a signed-out visitor, with each main button once", async () => {
    ctx.getSession.mockResolvedValue(null);
    render(await HomePage());

    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    const start = screen.getAllByRole("link", { name: "Commencer gratuitement" });
    expect(start).toHaveLength(1);
    expect(start[0].getAttribute("href")).toBe("/inscription");
    const signIn = screen.getAllByRole("link", { name: "Se connecter" });
    expect(signIn).toHaveLength(1);
    expect(signIn[0].getAttribute("href")).toBe("/connexion");
    expect(screen.getByRole("navigation", { name: "Pages légales" })).toBeTruthy();
  });

  it("still shows the landing page when the session lookup fails", async () => {
    ctx.getSession.mockRejectedValue(new Error("db down"));
    render(await HomePage());
    expect(screen.getByRole("link", { name: "Commencer gratuitement" })).toBeTruthy();
  });
});
