import { describe, expect, it } from "vitest";
import {
  addDays,
  ageOn,
  daysBetween,
  weekdayIndex,
  formatLongDate,
  formatShortDate,
  isValidTimezone,
  today,
} from "./dates";

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

describe("calendar arithmetic", () => {
  it("adds days across months, years and leap days", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("counts whole days, ignoring daylight saving time", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-01-10", "2026-01-01")).toBe(-9);
  });

  it("formats a long French date", () => {
    expect(formatLongDate("2026-10-03")).toBe("samedi 3 octobre");
  });
});

describe("formatShortDate", () => {
  it("omits the year when it is the current one", () => {
    expect(formatShortDate("2026-11-15", "2026-10-07")).toBe("15 nov.");
    expect(formatShortDate("2026-12-16", "2026-10-07")).toBe("16 déc.");
  });
  it("adds the year when it differs", () => {
    expect(formatShortDate("2027-03-02", "2026-10-07")).toBe("2 mars 2027");
  });
});

describe("weekdayIndex", () => {
  it("counts from Monday = 0 (specs/04 reminder_weekday)", () => {
    expect(weekdayIndex("2026-10-05")).toBe(0); // Monday
    expect(weekdayIndex("2026-10-03")).toBe(5); // Saturday
    expect(weekdayIndex("2026-10-04")).toBe(6); // Sunday
    expect(weekdayIndex("2026-01-01")).toBe(3); // Thursday
  });
});
