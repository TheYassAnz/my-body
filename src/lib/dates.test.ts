import { describe, expect, it } from "vitest";
import { ageOn, isValidTimezone, today } from "./dates";

describe("today", () => {
  const instant = new Date("2026-09-29T22:30:00Z");

  it("returns the calendar date in the user's timezone", () => {
    expect(today("Europe/Paris", instant)).toBe("2026-09-30");
    expect(today("America/New_York", instant)).toBe("2026-09-29");
  });
});

describe("ageOn", () => {
  it("counts a birthday only once it is reached", () => {
    expect(ageOn("2010-10-01", "2026-09-30")).toBe(15);
    expect(ageOn("2010-10-01", "2026-10-01")).toBe(16);
  });

  it("handles 29 February birthdays", () => {
    expect(ageOn("2008-02-29", "2024-02-28")).toBe(15);
    expect(ageOn("2008-02-29", "2024-02-29")).toBe(16);
  });
});

describe("isValidTimezone", () => {
  it("accepts IANA names and rejects unknown ones", () => {
    expect(isValidTimezone("Europe/Paris")).toBe(true);
    expect(isValidTimezone("Mars/Olympus_Mons")).toBe(false);
  });
});
