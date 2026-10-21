// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ social: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({ authClient: { signIn: { social: ctx.social } } }));

import { GoogleButton } from "./google-button";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const setup = () => render(<GoogleButton next="/accueil" errorCallbackURL="/connexion" />);

describe("GoogleButton", () => {
  it("shows the Google logo, hidden from screen readers, and a pointer cursor", () => {
    const { container } = setup();
    const button = screen.getByRole("button", { name: "Continuer avec Google" });

    expect(button.className).toContain("cursor-pointer");
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("starts the Google sign-in with the callbacks", () => {
    ctx.social.mockReturnValue(new Promise(() => {}));
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Continuer avec Google" }));

    expect(ctx.social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/accueil",
      errorCallbackURL: "/connexion",
    });
  });

  it.each([
    ["an error result", () => ctx.social.mockResolvedValue({ error: { message: "x" } })],
    ["a thrown error", () => ctx.social.mockRejectedValue(new Error("network"))],
  ])("shows the failure in the warning box after %s", async (_, arrange) => {
    arrange();
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Continuer avec Google" }));

    const alert = await waitFor(() => screen.getByRole("alert"));
    expect(alert.textContent).toBe(
      "La connexion avec Google est indisponible. Réessaie plus tard.",
    );
    expect(alert.className).toContain("bg-warn-bg");
    expect(alert.className).toContain("rounded-xl");
  });
});
