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

const DAY_MS = 86_400_000;

function toUtc(date: LocalDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

const longDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "samedi 3 octobre" */
export function formatLongDate(date: LocalDate): string {
  return longDate.format(new Date(toUtc(date)));
}
