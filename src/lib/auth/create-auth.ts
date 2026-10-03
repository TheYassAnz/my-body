import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import * as authSchema from "@/lib/db/schema/auth";
import type { Db } from "@/lib/db/types";
import { resetPasswordEmail, verificationEmail } from "@/lib/email/templates";
import type { SendEmail } from "@/lib/email/types";
import { PASSWORD_MIN_LENGTH } from "./constants";

export { PASSWORD_MIN_LENGTH };
const DAY = 60 * 60 * 24;

export type AuthDeps = {
  db: Db;
  sendEmail: SendEmail;
  baseURL: string;
  secret: string;
  google?: { clientId: string; clientSecret: string };
  rateLimitEnabled?: boolean;
  /** false in tests: nextCookies needs a Next.js request scope. */
  withNextCookies?: boolean;
};

export function createAuth(deps: AuthDeps) {
  return betterAuth({
    logger: { level: "warn" }, // never log emails (info-level duplicate-email message)
    baseURL: deps.baseURL,
    secret: deps.secret,
    database: drizzleAdapter(deps.db, { provider: "pg", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      requireEmailVerification: false, // EF-AUTH-01 CA4: access is immediate
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true, // EF-AUTH-04 CA2
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        // EF-AUTH-04 CA3: only verified emails can recover the account.
        if (!user.emailVerified) return;
        void deps
          .sendEmail({ to: user.email, ...resetPasswordEmail(url) })
          .catch(() => console.error("email_send_failed"));
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        // Not awaited: avoids timing attacks (Better Auth recommendation).
        void deps
          .sendEmail({ to: user.email, ...verificationEmail(url) })
          .catch(() => console.error("email_send_failed"));
      },
    },
    socialProviders: deps.google ? { google: deps.google } : {},
    // No trustedProviders: link only when the provider reports a verified email.
    account: { accountLinking: { enabled: true } },
    session: { expiresIn: 30 * DAY, updateAge: DAY },
    rateLimit: {
      enabled: deps.rateLimitEnabled ?? true,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 3600, max: 3 },
        "/send-verification-email": { window: 3600, max: 3 },
      },
    },
    plugins: deps.withNextCookies === false ? [] : [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
