import { describe, expect, it } from "vitest";
import { weightEntrySchema } from "./schemas";

const TODAY = "2026-10-03";
const parse = (o: Record<string, string | undefined>) =>
  weightEntrySchema(TODAY).safeParse({ date: TODAY, weight: "78,4", unit: "kg", ...o });
const firstMessage = (o: Record<string, string | undefined>) => {
  const r = parse(o);
  return r.success ? undefined : r.error.issues[0].message;
};

describe("weightEntrySchema", () => {
  it("accepts a minimal weighing and nulls the optional fields", () => {
    expect(parse({}).data).toEqual({
      date: TODAY,
      weightKg: 78.4,
      bodyFatPct: null,
      note: null,
      unit: "kg",
    });
  });

  it("accepts dot or comma decimals and rounds to storage precision", () => {
    expect(parse({ weight: "78.45" }).data?.weightKg).toBe(78.45);
    expect(parse({ weight: "78,456" }).data?.weightKg).toBe(78.46);
  });

  it("enforces 20 to 400 kg", () => {
    expect(parse({ weight: "19,9" }).success).toBe(false);
    expect(parse({ weight: "400,1" }).success).toBe(false);
    expect(parse({ weight: "20" }).success).toBe(true);
    expect(parse({ weight: "400" }).success).toBe(true);
    expect(firstMessage({ weight: "10" })).toBe("Poids entre 20 et 400 kg");
  });

  it("converts pounds before validating", () => {
    expect(parse({ weight: "172", unit: "lb" }).data?.weightKg).toBe(78.02);
    expect(parse({ weight: "44,1", unit: "lb" }).success).toBe(true);
    expect(firstMessage({ weight: "44", unit: "lb" })).toBe("Poids entre 44,1 et 881,8 lb");
  });

  it("rejects values that are not plain numbers", () => {
    for (const weight of ["", "abc", "1e400", "Infinity", "-80", undefined]) {
      const r = parse({ weight });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].path).toEqual(["weight"]);
    }
  });

  it("refuses future dates and dates before 1900", () => {
    expect(firstMessage({ date: "2026-10-04" })).toBe("La date ne peut pas être dans le futur");
    expect(parse({ date: "1899-12-31" }).success).toBe(false);
    expect(parse({ date: "1900-01-01" }).success).toBe(true);
    expect(parse({ date: "03/10/2026" }).success).toBe(false);
  });

  it("validates the optional body fat", () => {
    expect(parse({ bodyFat: "" }).data?.bodyFatPct).toBeNull();
    expect(parse({ bodyFat: "18,5" }).data?.bodyFatPct).toBe(18.5);
    expect(firstMessage({ bodyFat: "1.9" })).toBe("Masse grasse entre 2 et 70 %");
    expect(parse({ bodyFat: "70.1" }).success).toBe(false);
    expect(parse({ bodyFat: "beaucoup" }).success).toBe(false);
  });

  it("trims the note, empties it to null and counts characters like Postgres", () => {
    expect(parse({ note: "  sel  " }).data?.note).toBe("sel");
    expect(parse({ note: "   " }).data?.note).toBeNull();
    expect(parse({ note: "😀".repeat(140) }).success).toBe(true);
    expect(parse({ note: "😀".repeat(141) }).success).toBe(false);
    expect(firstMessage({ note: "a".repeat(141) })).toBe("140 caractères maximum");
  });
});
