import { daysBetween, weekdayIndex, type LocalDate } from "@/lib/dates";
import {
  MEASURE_STALE_DAYS,
  ZONES,
  featuredZones,
  zoneDelta,
  type DeltaPeriod,
  type DeltaTone,
  type GoalType,
  type Zone,
  type ZoneMeasure,
} from "@/lib/metrics";
import {
  formatInputDecimal,
  formatLength,
  formatLengthDelta,
  toDisplayLength,
  type LengthUnit,
} from "@/lib/units";
import { PROTOCOLS, ZONE_LABELS } from "./copy";
import type { MeasureRow } from "./queries";

export const PERIOD_OPTIONS: readonly { value: DeltaPeriod; param: string; label: string }[] = [
  { value: 7, param: "7", label: "7 j" },
  { value: 30, param: "30", label: "30 j" },
  { value: 90, param: "90", label: "90 j" },
  { value: "start", param: "debut", label: "Début" },
];

export function parsePeriod(raw: string | undefined): DeltaPeriod {
  return PERIOD_OPTIONS.find((o) => o.param === raw)?.value ?? 30;
}
export const periodParam = (period: DeltaPeriod) =>
  (PERIOD_OPTIONS.find((o) => o.value === period) as (typeof PERIOD_OPTIONS)[number]).param;

const WEEKDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;

export const seriesOf = (measures: readonly MeasureRow[], zone: Zone): ZoneMeasure[] =>
  measures.filter((m) => m.zone === zone).map((m) => ({ date: m.date, valueCm: m.valueCm }));

/** The recomposition waist indicator reads these (specs/03 §5.3). */
export const waistSeries = (measures: readonly MeasureRow[]) => seriesOf(measures, "waist");

export function agoLabel(days: number): string {
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

export type ZoneView = {
  zone: Zone;
  label: string;
  valueText: string | null;
  deltaText: string | null;
  tone: DeltaTone;
  /** "Taille : 84,5 cm, moins 3,5 cm sur 30 jours" (ENF-12). */
  ariaLabel: string;
};
export type SheetData = {
  label: string;
  protocol: string;
  /** Latest value, in the input format of the display unit. */
  prefill: string | null;
  /** "Précédente : 84,5 cm · il y a 7 j" */
  previousText: string | null;
};

function deltaPhrase(deltaCm: number, unit: LengthUnit, period: DeltaPeriod): string {
  const when = period === "start" ? "depuis le début" : `sur ${period} jours`;
  if (deltaCm === 0) return `stable ${when}`;
  return `${deltaCm < 0 ? "moins" : "plus"} ${formatLength(Math.abs(deltaCm), unit)} ${when}`;
}

function zoneView(
  zone: Zone,
  measures: readonly MeasureRow[],
  goal: GoalType | null,
  period: DeltaPeriod,
  unit: LengthUnit,
  today: LocalDate,
): ZoneView {
  const label = ZONE_LABELS[zone];
  const { current, deltaCm, tone } = zoneDelta(zone, seriesOf(measures, zone), period, today, goal);
  if (!current) {
    return {
      zone,
      label,
      valueText: null,
      deltaText: null,
      tone,
      ariaLabel: `${label} : pas encore mesurée`,
    };
  }
  const valueText = formatLength(current.valueCm, unit);
  return {
    zone,
    label,
    valueText,
    deltaText: deltaCm === null ? null : formatLengthDelta(deltaCm, unit),
    tone,
    ariaLabel:
      deltaCm === null
        ? `${label} : ${valueText}`
        : `${label} : ${valueText}, ${deltaPhrase(deltaCm, unit, period)}`,
  };
}

export type BodySummary = {
  zones: ZoneView[];
  sheet: Record<Zone, SheetData>;
  lastSessionDate: LocalDate | null;
};

/** Everything /corps shows, already computed (specs/01 §3.4). */
export function buildBodySummary(input: {
  measures: readonly MeasureRow[];
  goal: GoalType | null;
  period: DeltaPeriod;
  unit: LengthUnit;
  today: LocalDate;
}): BodySummary {
  const { measures, goal, period, unit, today } = input;
  const sheet = {} as Record<Zone, SheetData>;
  for (const zone of ZONES) {
    const past = seriesOf(measures, zone).filter((m) => m.date <= today);
    const latest = past.sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
    sheet[zone] = {
      label: ZONE_LABELS[zone],
      protocol: PROTOCOLS[zone],
      prefill: latest && formatInputDecimal(toDisplayLength(latest.valueCm, unit)),
      previousText:
        latest &&
        `Précédente : ${formatLength(latest.valueCm, unit)} · ${agoLabel(daysBetween(latest.date, today))}`,
    };
  }
  const dates = measures.map((m) => m.date).filter((d) => d <= today);
  return {
    zones: ZONES.map((zone) => zoneView(zone, measures, goal, period, unit, today)),
    sheet,
    lastSessionDate: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null,
  };
}

export type SessionZone = {
  zone: Zone;
  label: string;
  protocol: string;
  /** Latest value dated before today (reference of the recap). */
  previousCm: number | null;
  previousText: string | null;
  /** Value already saved today, if any. */
  todayCm: number | null;
  /** Input value: today's, else the previous one, else empty. */
  prefill: string;
};

export function buildSessionData(
  measures: readonly MeasureRow[],
  unit: LengthUnit,
  today: LocalDate,
): { zones: SessionZone[]; startIndex: number; firstTime: boolean } {
  const zones = ZONES.map((zone): SessionZone => {
    const series = seriesOf(measures, zone).sort((a, b) => a.date.localeCompare(b.date));
    const todayMeasure = series.find((m) => m.date === today) ?? null;
    const previous = series.filter((m) => m.date < today).at(-1) ?? null;
    const shown = todayMeasure ?? previous;
    return {
      zone,
      label: ZONE_LABELS[zone],
      protocol: PROTOCOLS[zone],
      previousCm: previous?.valueCm ?? null,
      previousText:
        previous &&
        `Précédente : ${formatLength(previous.valueCm, unit)} · ${agoLabel(daysBetween(previous.date, today))}`,
      todayCm: todayMeasure?.valueCm ?? null,
      prefill: shown ? formatInputDecimal(toDisplayLength(shown.valueCm, unit)) : "",
    };
  });
  const first = zones.findIndex((z) => z.todayCm === null);
  return { zones, startIndex: Math.max(0, first), firstTime: measures.length === 0 };
}

export type MeasureReminder = {
  lastSessionDate: LocalDate | null;
  daysSince: number | null;
  stale: boolean;
  /** "lundi", "aujourd'hui", or null when the user chose no measure day. */
  nextLabel: string | null;
};

/** EF-MEA-05. */
export function measureReminder(input: {
  lastSessionDate: LocalDate | null;
  reminderWeekday: number | null;
  today: LocalDate;
}): MeasureReminder {
  const { lastSessionDate, reminderWeekday, today } = input;
  const daysSince = lastSessionDate === null ? null : daysBetween(lastSessionDate, today);
  return {
    lastSessionDate,
    daysSince,
    stale: daysSince === null || daysSince > MEASURE_STALE_DAYS,
    nextLabel:
      reminderWeekday === null
        ? null
        : weekdayIndex(today) === reminderWeekday
          ? "aujourd'hui"
          : WEEKDAYS[reminderWeekday],
  };
}

export type MeasureBlockData =
  { state: "empty" } | { state: "ready"; zones: ZoneView[]; reminder: MeasureReminder };

/** Accueil "Mensurations" block: the goal's three zones over 30 days (specs/01 §3.2). */
export function buildMeasureBlock(input: {
  measures: readonly MeasureRow[];
  goal: GoalType | null;
  unit: LengthUnit;
  today: LocalDate;
  reminderWeekday: number | null;
}): MeasureBlockData {
  const { measures, goal, unit, today, reminderWeekday } = input;
  // Future-dated measures do not count: there is no last session to remind about.
  if (!measures.some((m) => m.date <= today)) return { state: "empty" };
  const { lastSessionDate } = buildBodySummary({ measures, goal, period: 30, unit, today });
  return {
    state: "ready",
    zones: featuredZones(goal).map((zone) => zoneView(zone, measures, goal, 30, unit, today)),
    reminder: measureReminder({ lastSessionDate, reminderWeekday, today }),
  };
}
