import "server-only";
import { after } from "next/server";
import { getDb } from "@/lib/db/client";
import { createEmailSender } from "@/lib/email/send";
import { requireEnv } from "@/lib/env";
import { createAuth, type Auth } from "./create-auth";

let instance: Auth | undefined;

export function getAuth(): Auth {
  if (!instance) {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_URL } = process.env;
    const sender = createEmailSender();
    instance = createAuth({
      db: getDb(),
      // after(): keeps the serverless function alive until delivery.
      sendEmail: (m) => {
        const p = sender(m);
        try {
          after(() => p.catch(() => undefined));
        } catch {
          // Outside a request scope: delivery is still attempted.
        }
        return p;
      },
      // Vercel Preview deployments have no fixed URL: fall back to VERCEL_URL.
      baseURL: BETTER_AUTH_URL || `https://${requireEnv("VERCEL_URL")}`,
      secret: requireEnv("BETTER_AUTH_SECRET"),
      google:
        GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
          ? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET }
          : undefined,
      rateLimitEnabled: process.env.AUTH_RATE_LIMIT !== "off",
    });
  }
  return instance;
}
