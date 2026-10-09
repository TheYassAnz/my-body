import { describe, expect, it } from "vitest";
import type { MeasureRow } from "./queries";
import {
  buildBodySummary,
  buildMeasureBlock,
  buildSessionData,
  measureReminder,
  parsePeriod,
  periodParam,
  waistSeries,
} from "./summary";

const NNBSP = "\u202f";
const MINUS = "−";
const TODAY = "2026-10-03";
let n = 0;
const row = (date: string, zone: MeasureRow["zone"], valueCm: number): MeasureRow => ({
  id: `m${n++}`,
  sessionId: `s-${date}`,
  date,
  zone,
  valueCm,
});
const WAIST = [
  row("2026-08-20", "waist", 90),
  row("2026-09-10", "waist", 88),
  row("2026-10-01", "waist", 86.5),
];

describe("period parameter", () => {
  it("defaults to 30 days and rejects anything unknown", () => {
    expect(parsePeriod(undefined)).toBe(30);
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("debut")).toBe("start");
    for (const bad of ["", "15", "-7", "start", "30; drop"]) expect(parsePeriod(bad)).toBe(30);
  });
  it("round-trips", () => {
    for (const p of [7, 30, 90, "start"] as const) expect(parsePeriod(periodParam(p))).toBe(p);
  });
});

describe("buildBodySummary", () => {
  const summary = (measures: MeasureRow[], over = {}) =>
    buildBodySummary({ measures, goal: "lose", period: 30, unit: "cm", today: TODAY, ...over });

  it("describes a never-measured account with hollow zones", () => {
    const s = summary([]);
    expect(s.zones).toHaveLength(8);
    expect(s.zones[0]).toMatchObject({
      zone: "neck",
      label: "Cou",
      valueText: null,
      deltaText: null,
      ariaLabel: "Cou : pas encore mesurée",
    });
    expect(s.lastSessionDate).toBeNull();
  });

  it("gives the value, the delta, the tone and a complete accessible label", () => {
    const waist = summary(WAIST).zones.find((z) => z.zone === "waist");
    expect(waist).toMatchObject({
      valueText: `86,5${NNBSP}cm`,
      deltaText: `${MINUS}3,5${NNBSP}cm`,
      tone: "positive",
      ariaLabel: `Taille : 86,5${NNBSP}cm, moins 3,5${NNBSP}cm sur 30 jours`,
    });
  });

  it("words the period in the label", () => {
    const label = (period: 7 | 30 | 90 | "start") =>
      summary(WAIST, { period }).zones.find((z) => z.zone === "waist")?.ariaLabel;
    expect(label(7)).toMatch(/moins 1,5.cm sur 7 jours$/);
    expect(label(90)).toMatch(/sur 90 jours$/);
    expect(label("start")).toMatch(/moins 3,5.cm depuis le début$/);
  });

  it("says 'plus' for an increase and 'stable' below 0.3 cm", () => {
    const up = summary([row("2026-08-20", "chest", 100), row("2026-10-01", "chest", 102)], {
      goal: "gain",
    }).zones.find((z) => z.zone === "chest");
    expect(up).toMatchObject({
      tone: "positive",
      ariaLabel: expect.stringMatching(/plus 2,0.cm sur 30 jours/),
    });
    const flat = summary([
      row("2026-08-20", "chest", 100),
      row("2026-10-01", "chest", 100.1),
    ]).zones.find((z) => z.zone === "chest");
    expect(flat).toMatchObject({ deltaText: `0${NNBSP}cm`, tone: "neutral" });
    expect(flat?.ariaLabel).toMatch(/stable sur 30 jours/);
  });

  it("shows a value without delta when there is a single measure", () => {
    const z = summary([row("2026-10-01", "waist", 86.5)]).zones.find((x) => x.zone === "waist");
    expect(z).toMatchObject({ valueText: `86,5${NNBSP}cm`, deltaText: null });
    expect(z?.ariaLabel).toBe(`Taille : 86,5${NNBSP}cm`);
  });

  it("converts to inches", () => {
    const z = summary(WAIST, { unit: "in" }).zones.find((x) => x.zone === "waist");
    expect(z?.valueText).toBe(`34,1${NNBSP}in`);
    expect(z?.deltaText).toBe(`${MINUS}1,4${NNBSP}in`);
  });

  it("is grey without a goal", () => {
    expect(summary(WAIST, { goal: null }).zones.find((z) => z.zone === "waist")?.tone).toBe(
      "neutral",
    );
  });

  it("feeds the zone sheet: protocol, previous value with its age, pre-filled input", () => {
    const sheet = summary(WAIST).sheet.waist;
    expect(sheet.label).toBe("Taille");
    expect(sheet.protocol).toMatch(/nombril/);
    expect(sheet.previousText).toBe(`Précédente : 86,5${NNBSP}cm · il y a 2 j`);
    expect(sheet.prefill).toBe("86,5");
    expect(summary([]).sheet.waist).toMatchObject({ previousText: null, prefill: null });
  });

  it("says 'aujourd'hui' and 'hier' instead of 'il y a 0 j'", () => {
    const at = (date: string) => summary([row(date, "waist", 86)]).sheet.waist.previousText;
    expect(at(TODAY)).toMatch(/· aujourd'hui$/);
    expect(at("2026-10-02")).toMatch(/· hier$/);
  });

  it("returns the date of the most recent session", () => {
    expect(summary([...WAIST, row("2026-09-30", "neck", 38)]).lastSessionDate).toBe("2026-10-01");
  });
});

describe("buildSessionData", () => {
  it("is a first time and starts at the first zone for a never-measured account", () => {
    const s = buildSessionData([], "cm", TODAY);
    expect(s.firstTime).toBe(true);
    expect(s.startIndex).toBe(0);
    expect(s.zones.map((z) => z.zone)).toEqual([
      "neck",
      "shoulders",
      "chest",
      "arm",
      "waist",
      "hips",
      "thigh",
      "calf",
    ]);
    expect(s.zones[0]).toMatchObject({
      previousCm: null,
      previousText: null,
      todayCm: null,
      prefill: "",
    });
  });

  it("pre-fills with the previous value and shows how long ago it was", () => {
    const s = buildSessionData(WAIST, "cm", TODAY);
    expect(s.firstTime).toBe(false);
    const waist = s.zones[4];
    expect(waist).toMatchObject({
      zone: "waist",
      previousCm: 86.5,
      prefill: "86,5",
      todayCm: null,
    });
    expect(waist.previousText).toBe(`Précédente : 86,5${NNBSP}cm · il y a 2 j`);
    expect(s.zones[0].prefill).toBe(""); // neck was never measured
  });

  it("resumes at the first zone without a value dated today and pre-fills today's values", () => {
    const measures = [
      row("2026-09-26", "shoulders", 120),
      row("2026-09-26", "chest", 100),
      row(TODAY, "neck", 38.2),
      row(TODAY, "chest", 101.4),
    ];
    const s = buildSessionData(measures, "cm", TODAY);
    expect(s.startIndex).toBe(1); // shoulders: skipped earlier today
    expect(s.zones[0]).toMatchObject({ todayCm: 38.2, prefill: "38,2", previousCm: null });
    expect(s.zones[2]).toMatchObject({ todayCm: 101.4, prefill: "101,4", previousCm: 100 }); // previous = before today
    expect(s.zones[1]).toMatchObject({ todayCm: null, prefill: "120,0", previousCm: 120 });
  });

  it("starts over when every zone was measured today", () => {
    const all = (
      ["neck", "shoulders", "chest", "arm", "waist", "hips", "thigh", "calf"] as const
    ).map((z) => row(TODAY, z, 50));
    expect(buildSessionData(all, "cm", TODAY).startIndex).toBe(0);
  });
});

describe("measureReminder (EF-MEA-05)", () => {
  it("asks for a first measure when there is none", () => {
    expect(measureReminder({ lastSessionDate: null, reminderWeekday: null, today: TODAY })).toEqual(
      {
        lastSessionDate: null,
        daysSince: null,
        stale: true,
        nextLabel: null,
      },
    );
  });
  it("is stale after more than 14 days, not at exactly 14", () => {
    const at = (d: string) =>
      measureReminder({ lastSessionDate: d, reminderWeekday: null, today: TODAY });
    expect(at("2026-09-19")).toMatchObject({ daysSince: 14, stale: false });
    expect(at("2026-09-18")).toMatchObject({ daysSince: 15, stale: true });
  });
  it("names the next measure day, or 'aujourd'hui'", () => {
    const next = (reminderWeekday: number | null) =>
      measureReminder({ lastSessionDate: "2026-09-30", reminderWeekday, today: TODAY }).nextLabel;
    expect(next(null)).toBeNull();
    expect(next(0)).toBe("lundi");
    expect(next(5)).toBe("aujourd'hui"); // 2026-10-03 is a Saturday
    expect(next(6)).toBe("dimanche");
  });
});

describe("buildMeasureBlock (Accueil)", () => {
  const block = (measures: MeasureRow[], over = {}) =>
    buildMeasureBlock({
      measures,
      goal: "lose",
      unit: "cm",
      today: TODAY,
      reminderWeekday: null,
      ...over,
    });

  it("is an empty state for an account that never measured", () => {
    expect(block([])).toEqual({ state: "empty" });
  });

  it("shows the three featured zones of the goal with their 30-day delta", () => {
    const b = block([...WAIST, row("2026-10-01", "hips", 100), row("2026-08-20", "hips", 102)]);
    expect(b.state).toBe("ready");
    if (b.state !== "ready") return;
    expect(b.zones.map((z) => z.zone)).toEqual(["waist", "hips", "thigh"]);
    expect(b.zones[0]).toMatchObject({
      label: "Taille",
      valueText: `86,5${NNBSP}cm`,
      tone: "positive",
    });
    expect(b.zones[2]).toMatchObject({ label: "Cuisse", valueText: null, deltaText: null });
    expect(b.reminder).toMatchObject({ daysSince: 2, stale: false });
  });

  it("uses the maintenance zones without a goal", () => {
    const b = block(WAIST, { goal: null });
    expect(b.state === "ready" && b.zones.map((z) => z.zone)).toEqual(["waist", "hips", "arm"]);
  });
});

describe("waistSeries", () => {
  it("keeps only the waist, as dated values", () => {
    expect(waistSeries([row("2026-10-01", "neck", 38), ...WAIST])).toEqual([
      { date: "2026-08-20", valueCm: 90 },
      { date: "2026-09-10", valueCm: 88 },
      { date: "2026-10-01", valueCm: 86.5 },
    ]);
  });
});
