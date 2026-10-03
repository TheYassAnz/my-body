/** Calendar date as lived by the user, formatted YYYY-MM-DD. */
export type LocalDate = string;

/** "Today" in the given IANA timezone. `now` is injectable for tests. */
export function today(timezone: string, now: Date = new Date()): LocalDate {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Full years between birthDate and `on`, both local dates. */
export function ageOn(birthDate: LocalDate, on: LocalDate): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  const birthdayReached = m > bm || (m === bm && d >= bd);
  return y - by - (birthdayReached ? 0 : 1);
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
