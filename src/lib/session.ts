import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { hasRequiredConsents } from "@/features/consent/queries";
import { getProfile, type Profile } from "@/features/profile/queries";
import { accessRedirect, type Area } from "@/lib/access";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";

export type CurrentUser = {
  userId: string;
  email: string;
  emailVerified: boolean;
  profile: Profile | null;
};

/** Server-side guard: the only source of userId for queries and actions. Memoized per request. */
export const requireUser = cache(async (area: Area): Promise<CurrentUser> => {
  // headers() first: it opts the route out of prerendering before getAuth() reads env vars.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) redirect("/connexion");

  const db = getDb();
  const userId = session.user.id;
  const [hasConsents, profile] = await Promise.all([
    hasRequiredConsents(db, userId),
    getProfile(db, userId),
  ]);

  const target = accessRedirect(area, {
    signedIn: true,
    hasConsents,
    onboardingCompleted: Boolean(profile?.onboardingCompletedAt),
  });
  if (target) redirect(target);

  return { userId, email: session.user.email, emailVerified: session.user.emailVerified, profile };
});
