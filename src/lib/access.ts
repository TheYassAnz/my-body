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

/** Only same-origin paths are allowed as post-login destinations (specs/07 §7). */
export function safeNext(next: unknown): string {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return "/accueil";
  }
  return next;
}
