import { describe, expect, it } from "vitest";
import { bodyStepSchema, sexStepSchema } from "./schemas";

const TODAY = "2026-10-01";
const body = (o: Record<string, string>) =>
  bodyStepSchema(TODAY).safeParse({
    height: "178",
    lengthUnit: "cm",
    birthDate: "1995-05-12",
    ...o,
  });

describe("bodyStepSchema", () => {
  it("accepts a valid adult profile", () => {
    const r = body({});
    expect(r.success && r.data).toEqual({
      heightCm: 178,
      lengthUnit: "cm",
      birthDate: "1995-05-12",
    });
  });

  it("converts inches to centimetres", () => {
    const r = body({ height: "70", lengthUnit: "in" });
    expect(r.success && r.data.heightCm).toBe(177.8);
  });

  it("enforces the 100-250 cm range", () => {
    expect(body({ height: "99.9" }).success).toBe(false);
    expect(body({ height: "250.1" }).success).toBe(false);
    expect(body({ height: "abc" }).success).toBe(false);
  });

  it("refuses users younger than 16", () => {
    expect(body({ birthDate: "2010-10-02" }).success).toBe(false);
    expect(body({ birthDate: "2010-10-01" }).success).toBe(true);
  });

  it("explains the age limit", () => {
    const r = body({ birthDate: "2012-01-01" });
    expect(!r.success && r.error.issues[0].message).toBe("my-body est réservé aux 16 ans et plus");
  });
});

describe("sexStepSchema", () => {
  it("requires a silhouette and falls back to Europe/Paris for an invalid timezone", () => {
    expect(sexStepSchema.safeParse({ timezone: "Europe/Paris" }).success).toBe(false);
    const r = sexStepSchema.safeParse({ sex: "female", timezone: "Nowhere/Land" });
    expect(r.success && r.data).toEqual({ sex: "female", timezone: "Europe/Paris" });
  });
});
