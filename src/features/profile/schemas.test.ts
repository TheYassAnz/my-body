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
  it("accepts a comma decimal height", () => {
    expect(body({ height: "168,5" }).data?.heightCm).toBe(168.5);
  });

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

  it("accepts 100 and 250 cm and refuses 99 and 251 cm", () => {
    expect(body({ height: "100" }).success).toBe(true);
    expect(body({ height: "250" }).success).toBe(true);
    expect(body({ height: "99" }).success).toBe(false);
    expect(body({ height: "251" }).success).toBe(false);
  });

  it("applies the range after inch conversion (rounded to 0.1 cm)", () => {
    // 39.4 in = 100.1 cm, 39.3 in = 99.8 cm, 98.4 in = 249.9 cm, 98.5 in = 250.2 cm
    const inch = (height: string) => body({ height, lengthUnit: "in" });
    const ok39 = inch("39.4");
    expect(ok39.success && ok39.data.heightCm).toBe(100.1);
    expect(inch("39.3").success).toBe(false);
    const ok98 = inch("98.4");
    expect(ok98.success && ok98.data.heightCm).toBe(249.9);
    expect(inch("98.5").success).toBe(false);
  });

  it("rejects absurd or non-finite heights with a field error, in both units", () => {
    for (const lengthUnit of ["cm", "in"]) {
      for (const height of ["1e30", "1e-7", "Infinity", "-Infinity", "NaN", "1e21", "0"]) {
        const r = body({ height, lengthUnit });
        expect(r.success).toBe(false);
        expect(!r.success && r.error.issues.some((i) => i.path[0] === "height")).toBe(true);
      }
    }
    const r = body({ height: "1e30" });
    expect(!r.success && r.error.issues[0].message).toBe("Taille entre 100 et 250 cm");
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
