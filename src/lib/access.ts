/** Route groups and what they require (spec deviation #2). */
export type Area = "app" | "settings" | "onboarding" | "consent";

export type AccessState = {
  signedIn: boolean;
  hasConsents: boolean;
  onboardingCompleted: boolean;
};

export function accessRedirect(area: Area, s: AccessState): string | null {
  if (!s.signedIn) return "/connexion";
  if (!s.hasConsents) return area === "consent" ? null : "/consentement";
  if (area === "consent") return s.onboardingCompleted ? "/accueil" : "/onboarding";
  if (area === "app" && !s.onboardingCompleted) return "/onboarding";
  if (area === "onboarding" && s.onboardingCompleted) return "/accueil";
  return null;
}

const FORBIDDEN_CHARS = /[\\\u0000-\u001f\u007f]/;

/**
 * Only same-origin paths are allowed as post-login destinations (specs/07 §7).
 * Backslashes and control characters are rejected: browsers strip tab/CR/LF
 * and treat "\\" as "/", so "/\t/evil.example" would become "//evil.example".
 */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || FORBIDDEN_CHARS.test(next)) {
    return "/accueil";
  }
  try {
    const url = new URL(next, "http://x");
    if (url.origin !== "http://x") return "/accueil";
    return url.pathname + url.search;
  } catch {
    return "/accueil";
  }
}
