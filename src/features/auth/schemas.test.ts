import { describe, expect, it } from "vitest";
import { consentSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

const valid = {
  email: "  Julie@Example.com ",
  password: "correct-horse-battery",
  consentHealth: "on",
  consentTerms: "on",
};

function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

describe("signUpSchema", () => {
  it("normalises the email", () => {
    const r = signUpSchema.safeParse(valid);
    expect(r.success && r.data.email).toBe("julie@example.com");
  });

  it("requires a 10-character password", () => {
    const r = signUpSchema.safeParse({ ...valid, password: "123456789" });
    expect(r.success).toBe(false);
  });

  it("requires both consents, unticked by default", () => {
    const withoutHealth = omit(valid, "consentHealth");
    const withoutTerms = omit(valid, "consentTerms");
    expect(signUpSchema.safeParse(withoutHealth).success).toBe(false);
    expect(signUpSchema.safeParse(withoutTerms).success).toBe(false);
  });

  it("rejects malformed emails", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "julie@" }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password (length is not revealed at sign-in)", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const base = { token: "t", password: "correct-horse-battery" };
    expect(
      resetPasswordSchema.safeParse({ ...base, confirm: "correct-horse-battery" }).success,
    ).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...base, confirm: "other-password-1" }).success).toBe(
      false,
    );
  });
});

describe("consentSchema", () => {
  it("requires both boxes", () => {
    expect(consentSchema.safeParse({ consentHealth: "on", consentTerms: "on" }).success).toBe(true);
    expect(consentSchema.safeParse({ consentHealth: "on" }).success).toBe(false);
  });
});
