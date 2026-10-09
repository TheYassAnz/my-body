import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  signInEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  deleteUser: vi.fn(),
  recordSignUpConsentsAction: vi.fn(),
  assign: vi.fn(),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signUp: { email: m.signUpEmail },
    signIn: { email: m.signInEmail },
    requestPasswordReset: m.requestPasswordReset,
    resetPassword: m.resetPassword,
    deleteUser: m.deleteUser,
  },
}));
vi.mock("./actions", () => ({ recordSignUpConsentsAction: m.recordSignUpConsentsAction }));

import {
  deleteAccountAction,
  requestPasswordResetAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "./client-actions";

const PASSWORD = "correct-horse-battery";
const ok = { data: {}, error: null };
const failure = (status: number, code?: string) => ({
  data: null,
  error: { status, statusText: "", code },
});

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.stubGlobal("window", { location: { assign: m.assign } });
  m.recordSignUpConsentsAction.mockResolvedValue({ ok: true });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("signUpAction", () => {
  const valid = {
    email: " Julie@Example.com ",
    password: PASSWORD,
    consentHealth: "on",
    consentTerms: "on",
  };

  it("validates before calling the server and never echoes the password", async () => {
    const r = await signUpAction(null, form({ email: "julie@", password: "short" }));
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ values: { email: "julie@" } });
    expect(JSON.stringify(r)).not.toContain("short");
    expect(m.signUpEmail).not.toHaveBeenCalled();
  });

  it("creates the account over HTTP, records the consents, then opens onboarding", async () => {
    m.signUpEmail.mockResolvedValue(ok);
    const r = await signUpAction(null, form(valid));

    expect(r).toEqual({ ok: true });
    expect(m.signUpEmail).toHaveBeenCalledWith({
      name: "julie",
      email: "julie@example.com",
      password: PASSWORD,
      callbackURL: "/accueil?email=verifie",
    });
    expect(m.recordSignUpConsentsAction).toHaveBeenCalledWith({
      consentHealth: "on",
      consentTerms: "on",
    });
    expect(m.assign).toHaveBeenCalledWith("/onboarding");
  });

  it("still opens onboarding when the consents could not be saved (the guard asks again)", async () => {
    m.signUpEmail.mockResolvedValue(ok);
    m.recordSignUpConsentsAction.mockRejectedValue(new Error("network"));
    expect(await signUpAction(null, form(valid))).toEqual({ ok: true });
    expect(m.assign).toHaveBeenCalledWith("/onboarding");
  });

  it("reports an existing account on the email field", async () => {
    m.signUpEmail.mockResolvedValue(failure(422, "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"));
    const r = await signUpAction(null, form(valid));
    expect(r).toEqual({
      ok: false,
      fieldErrors: { email: ["Un compte existe déjà avec cet email."] },
      values: { email: valid.email },
    });
    expect(m.recordSignUpConsentsAction).not.toHaveBeenCalled();
    expect(m.assign).not.toHaveBeenCalled();
  });

  it("explains rate limiting", async () => {
    m.signUpEmail.mockResolvedValue(failure(429));
    const r = await signUpAction(null, form(valid));
    expect(r).toMatchObject({
      ok: false,
      formError: "Trop de tentatives. Réessaie dans une minute.",
    });
  });

  it("never throws when the network fails", async () => {
    m.signUpEmail.mockRejectedValue(new TypeError("fetch failed"));
    const r = await signUpAction(null, form(valid));
    expect(r).toMatchObject({ ok: false, formError: "Une erreur est survenue, réessaie." });
  });
});

describe("signInAction", () => {
  it("signs in and goes to the requested page", async () => {
    m.signInEmail.mockResolvedValue(ok);
    const r = await signInAction(
      null,
      form({ email: "julie@example.com", password: "x", next: "/progres?p=30" }),
    );
    expect(r).toEqual({ ok: true });
    expect(m.signInEmail).toHaveBeenCalledWith({ email: "julie@example.com", password: "x" });
    expect(m.assign).toHaveBeenCalledWith("/progres?p=30");
  });

  it("refuses external destinations", async () => {
    m.signInEmail.mockResolvedValue(ok);
    await signInAction(
      null,
      form({ email: "julie@example.com", password: "x", next: "//evil.example" }),
    );
    expect(m.assign).toHaveBeenCalledWith("/accueil");
  });

  it("gives the same message for an unknown email and a wrong password", async () => {
    m.signInEmail.mockResolvedValue(failure(401, "INVALID_EMAIL_OR_PASSWORD"));
    const r = await signInAction(null, form({ email: "julie@example.com", password: "wrong" }));
    expect(r).toEqual({
      ok: false,
      formError: "Email ou mot de passe incorrect",
      values: { email: "julie@example.com" },
    });
    expect(m.assign).not.toHaveBeenCalled();
  });

  it("explains rate limiting", async () => {
    m.signInEmail.mockResolvedValue(failure(429));
    const r = await signInAction(null, form({ email: "julie@example.com", password: "wrong" }));
    expect(r).toMatchObject({ formError: "Trop de tentatives. Réessaie dans une minute." });
  });
});

describe("requestPasswordResetAction", () => {
  it("answers the same way whether or not the account exists", async () => {
    m.requestPasswordReset.mockResolvedValue(failure(400));
    expect(await requestPasswordResetAction(null, form({ email: "julie@example.com" }))).toEqual({
      ok: true,
    });
    expect(m.requestPasswordReset).toHaveBeenCalledWith({
      email: "julie@example.com",
      redirectTo: "/reinitialiser",
    });
  });

  it("explains rate limiting", async () => {
    m.requestPasswordReset.mockResolvedValue(failure(429));
    const r = await requestPasswordResetAction(null, form({ email: "julie@example.com" }));
    expect(r).toMatchObject({ ok: false, formError: "Trop de demandes. Réessaie plus tard." });
  });

  it("keeps the email when it is invalid", async () => {
    const r = await requestPasswordResetAction(null, form({ email: "julie@" }));
    expect(r).toMatchObject({ ok: false, values: { email: "julie@" } });
    expect(m.requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe("resetPasswordAction", () => {
  const valid = { token: "tok", password: PASSWORD, confirm: PASSWORD };

  it("checks that both passwords match", async () => {
    const r = await resetPasswordAction(null, form({ ...valid, confirm: "other-password-1" }));
    expect(r).toMatchObject({ ok: false, fieldErrors: { confirm: expect.any(Array) } });
    expect(m.resetPassword).not.toHaveBeenCalled();
  });

  it("sets the new password and goes to sign-in", async () => {
    m.resetPassword.mockResolvedValue(ok);
    expect(await resetPasswordAction(null, form(valid))).toEqual({ ok: true });
    expect(m.resetPassword).toHaveBeenCalledWith({ token: "tok", newPassword: PASSWORD });
    expect(m.assign).toHaveBeenCalledWith("/connexion?reinitialise=1");
  });

  it("reports an invalid or expired link", async () => {
    m.resetPassword.mockResolvedValue(failure(400, "INVALID_TOKEN"));
    const r = await resetPasswordAction(null, form(valid));
    expect(r).toEqual({
      ok: false,
      formError: "Ce lien est invalide ou a expiré. Refais une demande.",
    });
  });
});

describe("deleteAccountAction", () => {
  it("refuses anything but SUPPRIMER and calls nothing", async () => {
    for (const confirmation of ["", "supprimer", "SUPPRIMER ", "OUI"]) {
      const result = await deleteAccountAction(null, form({ confirmation, password: PASSWORD }));
      expect(result).toMatchObject({
        ok: false,
        fieldErrors: { confirmation: [expect.any(String)] },
      });
    }
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes with the password and goes back to the landing page", async () => {
    m.deleteUser.mockResolvedValue(ok);

    const result = await deleteAccountAction(
      null,
      form({ confirmation: "SUPPRIMER", password: PASSWORD }),
    );

    expect(result).toEqual({ ok: true });
    expect(m.deleteUser).toHaveBeenCalledWith({ password: PASSWORD });
    expect(m.assign).toHaveBeenCalledWith("/");
  });

  it("sends no password for an account without one", async () => {
    m.deleteUser.mockResolvedValue(ok);

    await deleteAccountAction(null, form({ confirmation: "SUPPRIMER" }));

    expect(m.deleteUser).toHaveBeenCalledWith({});
  });

  it("shows a wrong password on the field, and never sends it back", async () => {
    m.deleteUser.mockResolvedValue(failure(400, "INVALID_PASSWORD"));

    const result = await deleteAccountAction(
      null,
      form({ confirmation: "SUPPRIMER", password: "bad" }),
    );

    expect(result).toEqual({ ok: false, fieldErrors: { password: ["Mot de passe incorrect"] } });
    expect(JSON.stringify(result)).not.toContain("bad");
    expect(m.assign).not.toHaveBeenCalled();
  });

  it("asks for the password when the server says it is missing", async () => {
    m.deleteUser.mockResolvedValue(failure(400, "PASSWORD_REQUIRED"));

    const result = await deleteAccountAction(
      null,
      form({ confirmation: "SUPPRIMER", password: "" }),
    );

    expect(result).toEqual({ ok: false, fieldErrors: { password: ["Saisis ton mot de passe"] } });
    expect(m.assign).not.toHaveBeenCalled();
  });

  it("asks to sign in again when the session is too old", async () => {
    m.deleteUser.mockResolvedValue(failure(400, "SESSION_EXPIRED"));

    const result = await deleteAccountAction(null, form({ confirmation: "SUPPRIMER" }));

    expect(result).toMatchObject({
      ok: false,
      formError: expect.stringContaining("reconnecte-toi"),
    });
    expect(m.assign).not.toHaveBeenCalled();
  });

  it("explains a rate limit, and falls back to a generic error", async () => {
    m.deleteUser.mockResolvedValue(failure(429));
    expect(
      await deleteAccountAction(null, form({ confirmation: "SUPPRIMER", password: PASSWORD })),
    ).toMatchObject({ ok: false, formError: expect.stringContaining("Trop de tentatives") });

    m.deleteUser.mockRejectedValue(new Error("network"));
    expect(
      await deleteAccountAction(null, form({ confirmation: "SUPPRIMER", password: PASSWORD })),
    ).toMatchObject({ ok: false, formError: expect.any(String) });
  });
});
