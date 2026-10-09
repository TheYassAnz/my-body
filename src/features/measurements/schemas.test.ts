import { describe, expect, it } from "vitest";
import { measureSchema } from "./schemas";

const TODAY = "2026-10-03";
const parse = (input: Record<string, string>) =>
  measureSchema(TODAY).safeParse({ date: TODAY, zone: "waist", unit: "cm", ...input });
const errorOn = (input: Record<string, string>, field: string) => {
  const r = parse(input);
  return !r.success && r.error.issues.some((i) => i.path[0] === field);
};

describe("measureSchema (specs/03 §9)", () => {
  it("accepts a value with a comma or a point and stores 1 decimal", () => {
    expect(parse({ value: "84,5" })).toMatchObject({
      success: true,
      data: { date: TODAY, zone: "waist", valueCm: 84.5, unit: "cm" },
    });
    expect(parse({ value: "84.54" })).toMatchObject({ success: true, data: { valueCm: 84.5 } });
  });

  it("accepts the bounds 10 and 250", () => {
    expect(parse({ value: "10" }).success).toBe(true);
    expect(parse({ value: "250" }).success).toBe(true);
  });

  it.each(["9,9", "250,1", "0", "-80", "", " ", "abc", "1e3", "Infinity", "NaN", "84,5,2"])(
    "rejects the value %j",
    (value) => {
      expect(errorOn({ value }, "value")).toBe(true);
    },
  );

  it("converts inches before checking the bounds", () => {
    expect(parse({ value: "33,3", unit: "in" })).toMatchObject({ data: { valueCm: 84.6 } });
    expect(errorOn({ value: "3,9", unit: "in" }, "value")).toBe(true); // 9.9 cm
    expect(errorOn({ value: "98,5", unit: "in" }, "value")).toBe(true); // 250.2 cm
    expect(parse({ value: "98,4", unit: "in" }).success).toBe(true); // 249.9 cm
  });

  it("mentions the bounds in the user's unit", () => {
    const cm = parse({ value: "5" });
    expect(!cm.success && cm.error.issues[0].message).toBe("Mesure entre 10 et 250 cm");
    const inch = parse({ value: "1", unit: "in" });
    expect(!inch.success && inch.error.issues[0].message).toMatch(/entre 3,9 et 98,4 in/);
  });

  it("rejects an unknown zone and an unknown unit", () => {
    expect(errorOn({ value: "30", zone: "ankle" }, "zone")).toBe(true);
    expect(errorOn({ value: "30", unit: "ft" }, "unit")).toBe(true);
  });

  it("rejects a future date and a date before 1900", () => {
    expect(errorOn({ value: "30", date: "2026-10-04" }, "date")).toBe(true);
    expect(errorOn({ value: "30", date: "1899-12-31" }, "date")).toBe(true);
    expect(errorOn({ value: "30", date: "not-a-date" }, "date")).toBe(true);
    expect(parse({ value: "30", date: "2026-10-03" }).success).toBe(true);
  });
});
