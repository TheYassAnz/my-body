import { describe, expect, it } from "vitest";
import { accessRedirect, safeNext, type AccessState } from "./access";

const state = (s: Partial<AccessState>): AccessState => ({
  signedIn: true,
  hasConsents: true,
  onboardingCompleted: true,
  ...s,
});

describe("accessRedirect", () => {
  it("sends anonymous visitors to the sign-in page", () => {
    expect(accessRedirect("app", state({ signedIn: false }))).toBe("/connexion");
    expect(accessRedirect("settings", state({ signedIn: false }))).toBe("/connexion");
  });

  it("asks for consent before anything else", () => {
    expect(accessRedirect("app", state({ hasConsents: false }))).toBe("/consentement");
    expect(accessRedirect("onboarding", state({ hasConsents: false }))).toBe("/consentement");
    expect(accessRedirect("consent", state({ hasConsents: false }))).toBeNull();
  });

  it("leaves the consent page once consent is given", () => {
    expect(accessRedirect("consent", state({ onboardingCompleted: false }))).toBe("/onboarding");
    expect(accessRedirect("consent", state({}))).toBe("/accueil");
  });

  it("keeps the app behind onboarding but lets settings through", () => {
    expect(accessRedirect("app", state({ onboardingCompleted: false }))).toBe("/onboarding");
    expect(accessRedirect("settings", state({ onboardingCompleted: false }))).toBeNull();
    expect(accessRedirect("onboarding", state({ onboardingCompleted: false }))).toBeNull();
  });

  it("does not replay onboarding once completed", () => {
    expect(accessRedirect("onboarding", state({}))).toBe("/accueil");
    expect(accessRedirect("app", state({}))).toBeNull();
  });
});

describe("safeNext", () => {
  it("keeps internal paths", () => {
    expect(safeNext("/progres")).toBe("/progres");
    expect(safeNext("/corps?periode=30j")).toBe("/corps?periode=30j");
  });

  it("falls back to /accueil for anything else", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      42,
    ]) {
      expect(safeNext(bad)).toBe("/accueil");
    }
  });
});
