import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuth, type Auth } from "@/lib/auth/create-auth";
import { session, user } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { EmailMessage } from "@/lib/email/types";
import { createTestDb } from "../helpers/db";

const EMAIL = "julie@example.com";
const PASSWORD = "correct-horse-battery";

describe("auth", () => {
  let db: Db;
  let close: () => Promise<void>;
  let auth: Auth;
  let sent: EmailMessage[];

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    sent = [];
    auth = createAuth({
      db,
      sendEmail: async (m) => {
        sent.push(m);
      },
      baseURL: "http://localhost:3000",
      secret: "test-secret-0123456789abcdef0123456789",
      rateLimitEnabled: false,
      withNextCookies: false,
    });
  });
  afterEach(() => close());

  const signUp = () =>
    auth.api.signUpEmail({ body: { name: "julie", email: EMAIL, password: PASSWORD } });

  it("creates an unverified user and sends a verification link", async () => {
    const res = await signUp();

    expect(res.user.emailVerified).toBe(false);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(EMAIL);
    expect(sent[0].text).toContain("/api/auth/verify-email?token=");
  });

  it("rejects passwords shorter than 10 characters", async () => {
    await expect(
      auth.api.signUpEmail({ body: { name: "julie", email: EMAIL, password: "short-123" } }),
    ).rejects.toThrow();
    const ok = await auth.api.signUpEmail({
      body: { name: "paul", email: "paul@example.com", password: "exactly-10" },
    });
    expect(ok.user.email).toBe("paul@example.com");
  });

  it("does not send a reset link to an unverified email", async () => {
    await signUp();
    sent = [];

    await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: "/reinitialiser" } });

    expect(sent).toHaveLength(0);
  });

  it("sends a reset link once the email is verified", async () => {
    await signUp();
    await db.update(user).set({ emailVerified: true }).where(eq(user.email, EMAIL));
    sent = [];

    await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: "/reinitialiser" } });

    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("mot de passe");
  });

  it("creates sessions that last 30 days", async () => {
    await signUp();
    const [row] = await db.select().from(session);
    const days = (row.expiresAt.getTime() - Date.now()) / 86_400_000;

    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it("never puts health-related words in emails", async () => {
    await signUp();
    expect(sent[0].text).not.toMatch(/poids|kg|mensuration/i);
  });
});
