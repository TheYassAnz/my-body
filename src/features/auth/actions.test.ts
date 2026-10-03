import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuth, type Auth } from "@/lib/auth/create-auth";
import { consent, user } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { EmailMessage } from "@/lib/email/types";
import { createTestDb } from "../../../tests/helpers/db";

const ctx = vi.hoisted(() => ({
  auth: undefined as unknown as Auth,
  db: undefined as unknown as Db,
  cookie: "",
  requireUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      cookie: ctx.cookie,
      origin: "http://localhost:3000",
      "x-forwarded-for": "203.0.113.7",
      // Headers of the Server Action request itself: must not leak into the auth call.
      "content-type": "multipart/form-data; boundary=x",
      "content-length": "999",
      "next-action": "abc",
    }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("@/lib/auth", () => ({ getAuth: () => ctx.auth }));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));

import {
  acceptConsentsAction,
  recordSignUpConsentsAction,
  resendVerificationAction,
  signOutAction,
} from "./actions";

const EMAIL = "julie@example.com";
const CONSENTS = { consentHealth: "on", consentTerms: "on" };

describe("auth server actions", () => {
  let close: () => Promise<void>;
  let sent: EmailMessage[];
  let userId: string;

  beforeEach(async () => {
    ({ db: ctx.db, close } = await createTestDb());
    sent = [];
    ctx.auth = createAuth({
      db: ctx.db,
      sendEmail: async (msg) => {
        sent.push(msg);
      },
      baseURL: "http://localhost:3000",
      secret: "test-secret-0123456789abcdef0123456789",
      rateLimitEnabled: true,
      withNextCookies: false,
    });
    const res = await ctx.auth.api.signUpEmail({
      body: { name: "julie", email: EMAIL, password: "correct-horse-battery" },
      returnHeaders: true,
    });
    userId = res.response.user.id;
    ctx.cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
    sent = [];
    ctx.requireUser.mockResolvedValue({
      userId,
      email: EMAIL,
      emailVerified: false,
      profile: null,
    });
  });
  afterEach(async () => {
    vi.clearAllMocks();
    await close();
  });

  const consentRows = () => ctx.db.select().from(consent).where(eq(consent.userId, userId));

  describe("recordSignUpConsentsAction", () => {
    it("records both consents for the signed-in user, once", async () => {
      expect(await recordSignUpConsentsAction(CONSENTS)).toEqual({ ok: true });
      expect(await recordSignUpConsentsAction(CONSENTS)).toEqual({ ok: true });
      expect(await consentRows()).toHaveLength(2);
    });

    it("refuses missing consents", async () => {
      const r = await recordSignUpConsentsAction({ consentHealth: "on" });
      expect(r).toMatchObject({ ok: false, fieldErrors: { consentTerms: expect.any(Array) } });
      expect(await consentRows()).toHaveLength(0);
    });

    it("records nothing without a session", async () => {
      ctx.cookie = "";
      const r = await recordSignUpConsentsAction(CONSENTS);
      expect(r.ok).toBe(false);
      expect(await ctx.db.select().from(consent)).toHaveLength(0);
    });
  });

  describe("acceptConsentsAction", () => {
    const form = (values: Record<string, string>) => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(values)) fd.set(k, v);
      return fd;
    };

    it("records the consents and opens onboarding", async () => {
      await expect(acceptConsentsAction(null, form(CONSENTS))).rejects.toThrow(
        "REDIRECT /onboarding",
      );
      expect(ctx.requireUser).toHaveBeenCalledWith("consent");
      expect(await consentRows()).toHaveLength(2);
    });

    it("does not insert duplicates on a double submit", async () => {
      await expect(acceptConsentsAction(null, form(CONSENTS))).rejects.toThrow("REDIRECT");
      await expect(acceptConsentsAction(null, form(CONSENTS))).rejects.toThrow("REDIRECT");
      expect(await consentRows()).toHaveLength(2);
    });

    it("asks again when a box is unticked", async () => {
      const r = await acceptConsentsAction(null, form({ consentTerms: "on" }));
      expect(r).toMatchObject({ ok: false, fieldErrors: { consentHealth: expect.any(Array) } });
      expect(await consentRows()).toHaveLength(0);
    });
  });

  describe("resendVerificationAction", () => {
    it("sends a new verification link to the session's email", async () => {
      expect(await resendVerificationAction()).toEqual({ ok: true });
      expect(ctx.requireUser).toHaveBeenCalledWith("settings");
      expect(sent).toHaveLength(1);
      expect(sent[0].to).toBe(EMAIL);
      expect(sent[0].text).toContain("callbackURL=%2Faccueil%3Femail%3Dverifie");
    });

    it("does nothing once the email is verified", async () => {
      ctx.requireUser.mockResolvedValue({
        userId,
        email: EMAIL,
        emailVerified: true,
        profile: null,
      });
      expect(await resendVerificationAction()).toEqual({ ok: true });
      expect(sent).toHaveLength(0);
    });

    it("goes through the HTTP rate limit (3 per hour)", async () => {
      for (let i = 0; i < 3; i++) expect(await resendVerificationAction()).toEqual({ ok: true });
      expect(await resendVerificationAction()).toEqual({
        ok: false,
        formError: "Patiente un peu avant de renvoyer l'email.",
      });
      expect(sent).toHaveLength(3);
    });

    it("reports a failure without throwing", async () => {
      await ctx.db.update(user).set({ email: "other@example.com" }).where(eq(user.id, userId));
      const r = await resendVerificationAction();
      expect(r).toEqual({ ok: false, formError: "Une erreur est survenue, réessaie." });
    });
  });

  describe("signOutAction", () => {
    it("ends the session and goes to sign-in", async () => {
      await expect(signOutAction()).rejects.toThrow("REDIRECT /connexion");
      expect(await ctx.auth.api.getSession({ headers: new Headers({ cookie: ctx.cookie }) })).toBe(
        null,
      );
    });
  });
});
