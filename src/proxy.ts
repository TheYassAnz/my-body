import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/** Optimistic check only (cookie presence). Real checks happen in requireUser(). */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const url = new URL("/connexion", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/accueil/:path*",
    "/progres/:path*",
    "/corps/:path*",
    "/objectif/:path*",
    "/reglages/:path*",
    "/onboarding/:path*",
    "/consentement",
  ],
};
