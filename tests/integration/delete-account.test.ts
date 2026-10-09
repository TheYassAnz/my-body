import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hasCredentialAccount } from "@/features/auth/queries";
import { createAuth, type Auth } from "@/lib/auth/create-auth";
import {
  account,
  consent,
  goal,
  measurement,
  measurementSession,
  profile,
  session,
  user,
  weightEntry,
} from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { EmailMessage } from "@/lib/email/types";
import { createTestDb } from "../helpers/db";

const PASSWORD = "correct-horse-battery";

describe("delete account", () => {
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

  async function signUp(name: string) {
    const { headers, response } = await auth.api.signUpEmail({
      body: { name, email: `${name}@example.com`, password: PASSWORD },
      returnHeaders: true,
    });
    const cookie = headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    return { userId: response.user.id, headers: new Headers({ cookie }) };
  }

  /** One row in every table that holds the user's data. */
  async function fillData(userId: string) {
    await db.insert(profile).values({ userId, sex: "female" });
    await db.insert(consent).values({ userId, kind: "health_data", version: "1" });
    await db
      .insert(weightEntry)
      .values({ userId, date: "2026-10-01", weightKg: 78.4, bodyFatPct: null, note: null });
    await db
      .insert(goal)
      .values({ userId, type: "maintain", startDate: "2026-10-01", startWeightKg: 78.4 });
    const [s] = await db
      .insert(measurementSession)
      .values({ userId, date: "2026-10-01" })
      .returning({ id: measurementSession.id });
    await db.insert(measurement).values({ sessionId: s.id, zone: "waist", valueCm: 85.5 });
  }

  async function rowsOf(userId: string) {
    const [users, accounts, sessions, profiles, consents, weights, goals, sessionRows] =
      await Promise.all([
        db.select().from(user).where(eq(user.id, userId)),
        db.select().from(account).where(eq(account.userId, userId)),
        db.select().from(session).where(eq(session.userId, userId)),
        db.select().from(profile).where(eq(profile.userId, userId)),
        db.select().from(consent).where(eq(consent.userId, userId)),
        db.select().from(weightEntry).where(eq(weightEntry.userId, userId)),
        db.select().from(goal).where(eq(goal.userId, userId)),
        db.select().from(measurementSession).where(eq(measurementSession.userId, userId)),
      ]);
    const measures = await db.select().from(measurement);
    const own = new Set(sessionRows.map((r) => r.id));
    return {
      users: users.length,
      accounts: accounts.length,
      sessions: sessions.length,
      profiles: profiles.length,
      consents: consents.length,
      weights: weights.length,
      goals: goals.length,
      measurementSessions: sessionRows.length,
      measurements: measures.filter((m) => own.has(m.sessionId)).length,
    };
  }

  it("deletes the user and every row they own, and nobody else's", async () => {
    const alice = await signUp("alice");
    const bob = await signUp("bob");
    await fillData(alice.userId);
    await fillData(bob.userId);

    await auth.api.deleteUser({ headers: alice.headers, body: { password: PASSWORD } });

    expect(Object.values(await rowsOf(alice.userId)).every((n) => n === 0)).toBe(true);
    expect(Object.values(await rowsOf(bob.userId)).every((n) => n >= 1)).toBe(true);
  });

  it("revokes the session: the old cookie no longer works, and signing in fails", async () => {
    const alice = await signUp("alice");

    await auth.api.deleteUser({ headers: alice.headers, body: { password: PASSWORD } });

    expect(await auth.api.getSession({ headers: alice.headers })).toBeNull();
    await expect(
      auth.api.signInEmail({ body: { email: "alice@example.com", password: PASSWORD } }),
    ).rejects.toThrow();
  });

  it("sends the confirmation email after the deletion, without any health data", async () => {
    const alice = await signUp("alice");
    await fillData(alice.userId);
    sent = [];

    await auth.api.deleteUser({ headers: alice.headers, body: { password: PASSWORD } });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("alice@example.com");
    expect(sent[0].subject).toContain("supprimé");
    expect(sent[0].text).not.toMatch(/\d+[.,]\d+\s?(kg|cm)|78/);
  });

  it("deletes nothing and sends nothing with a wrong password", async () => {
    const alice = await signUp("alice");
    await fillData(alice.userId);
    sent = [];

    await expect(
      auth.api.deleteUser({ headers: alice.headers, body: { password: "not-the-password" } }),
    ).rejects.toThrow();

    expect((await rowsOf(alice.userId)).users).toBe(1);
    expect((await rowsOf(alice.userId)).weights).toBe(1);
    expect(sent).toHaveLength(0);
  });

  it("refuses an old session without a password (SESSION_EXPIRED)", async () => {
    const alice = await signUp("alice");
    await db
      .update(session)
      .set({ createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000) })
      .where(eq(session.userId, alice.userId));

    await expect(auth.api.deleteUser({ headers: alice.headers, body: {} })).rejects.toThrow();

    expect((await rowsOf(alice.userId)).users).toBe(1);
  });

  it("accepts a fresh session without a password (Google accounts)", async () => {
    const alice = await signUp("alice");

    await auth.api.deleteUser({ headers: alice.headers, body: {} });

    expect((await rowsOf(alice.userId)).users).toBe(0);
  });

  it("hasCredentialAccount tells an email account from a Google-only one", async () => {
    const alice = await signUp("alice");
    await db.insert(user).values({ id: "gina", name: "gina", email: "gina@example.com" });
    await db
      .insert(account)
      .values({ id: "acc-gina", accountId: "g-1", providerId: "google", userId: "gina" });

    expect(await hasCredentialAccount(db, alice.userId)).toBe(true);
    expect(await hasCredentialAccount(db, "gina")).toBe(false);
  });
});
