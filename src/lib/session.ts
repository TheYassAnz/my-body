import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

/** Server-side guard: the only source of userId for queries and actions. */
export async function requireUser(area: Area): Promise<CurrentUser> {
  const session = await getAuth().api.getSession({ headers: await headers() });
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
}
