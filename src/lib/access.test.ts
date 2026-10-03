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

  it("rejects control characters that browsers strip from URLs", () => {
    for (const bad of ["/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/a\u0000b"]) {
      expect(safeNext(bad)).toBe("/accueil");
    }
  });

  it("keeps percent-encoded slashes (harmless, stays on the same origin)", () => {
    expect(safeNext("/%2F/evil")).toBe("/%2F/evil");
  });

  it("never returns a protocol-relative URL once dot-segments are resolved", () => {
    for (const bad of [
      "/..//evil.example",
      "/.//evil.example",
      "/a/..//evil.example",
      "/%2e%2e//evil.example",
    ]) {
      expect(safeNext(bad)).toBe("/accueil");
    }
  });

  it("is safe and idempotent over tricky inputs", () => {
    const inputs = [
      "/..//evil.example",
      "/.//evil.example",
      "/a/..//evil.example",
      "/%2e%2e//evil.example",
      "/a/b/../../..//x",
      "/%2E/%2E//x",
      "//evil.example",
      "/?next=//x",
      "/a?b=//c",
      "/%2F/evil",
      "/progres",
      "/",
      "/./",
      "/..",
      "/a/../b",
    ];
    for (const x of inputs) {
      const r = safeNext(x);
      expect(r.startsWith("//")).toBe(false);
      expect(r.startsWith("/")).toBe(true);
      expect(safeNext(r)).toBe(r);
    }
  });
});
