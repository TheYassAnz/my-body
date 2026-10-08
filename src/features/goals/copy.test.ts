import { describe, expect, it } from "vitest";
import type { ActiveGoalSummary } from "./summary";
import { projectionLabel, statusMessage } from "./copy";

const NNBSP = " ";
const MINUS = "−";
const summary = (
  over: Partial<ActiveGoalSummary> & { status: ActiveGoalSummary["status"] },
): ActiveGoalSummary => ({
  state: "active",
  type: "lose",
  targetKg: 75,
  weeklyRatePct: 0.5,
  startKg: 80,
  startDate: "2026-09-01",
  referenceKg: 78,
  progress: null,
  projection: { kind: "unavailable" },
  rate: null,
  ...over,
});
const st = (status: ActiveGoalSummary["status"]["status"], extra = {}) => ({
  status,
  missingEntries: 0,
  deviationKg: null,
  waist: null,
  ...extra,
});

describe("statusMessage (specs/03 §5)", () => {
  it.each([
    ["achieved", "lose", "Objectif atteint !"],
    ["wrong_direction", "lose", "Ta tendance remonte."],
    ["wrong_direction", "gain", "Ta tendance baisse."],
    ["too_fast", "lose", "Trop rapide : risque de perte musculaire."],
    ["too_fast", "gain", "Trop rapide : prise de gras probable."],
    ["too_slow", "lose", "Plus lent que prévu."],
    ["on_track", "gain", "Dans le rythme."],
    ["stable", "maintain", "Stable, dans ta zone (± 1,5 %)."],
  ] as const)("%s (%s)", (status, type, expected) => {
    expect(statusMessage(summary({ type, status: st(status) }), "kg")).toBe(expected);
  });

  it("explains the plateau", () => {
    expect(statusMessage(summary({ status: st("plateau") }), "kg")).toBe(
      "Plateau depuis 3 semaines. C'est normal de temps en temps. Si ça dure, ajuste ton alimentation ou ton activité.",
    );
  });

  it("counts the missing weighings, singular and plural", () => {
    expect(statusMessage(summary({ status: st("calibrating", { missingEntries: 4 }) }), "kg")).toBe(
      "Encore 4 pesées pour calculer ton rythme.",
    );
    expect(statusMessage(summary({ status: st("calibrating", { missingEntries: 1 }) }), "kg")).toBe(
      "Encore 1 pesée pour calculer ton rythme.",
    );
  });

  it("gives the gap out of the maintenance band, in the display unit", () => {
    const s = summary({ type: "maintain", status: st("out_of_band", { deviationKg: 2.5 }) });
    expect(statusMessage(s, "kg")).toBe(`Hors de ta zone : +2,5${NNBSP}kg`);
    expect(statusMessage({ ...s, status: st("out_of_band", { deviationKg: -1.2 }) }, "kg")).toBe(
      `Hors de ta zone : ${MINUS}1,2${NNBSP}kg`,
    );
    expect(statusMessage(s, "lb")).toBe(`Hors de ta zone : +5,5${NNBSP}lb`);
  });

  it("combines weight and waist for a recomposition", () => {
    const r = (
      status: "stable" | "out_of_band",
      waist: "waist_improving" | "waist_flat" | "waist_insufficient",
    ) =>
      statusMessage(
        summary({ type: "recomp", status: st(status, { waist, deviationKg: 2 }) }),
        "kg",
      );
    expect(r("stable", "waist_improving")).toBe(
      "Poids stable · Tour de taille en baisse : ta recompo fonctionne.",
    );
    expect(r("stable", "waist_flat")).toBe(
      "Poids stable · Tour de taille stable : patience, la recompo est lente.",
    );
    expect(r("out_of_band", "waist_insufficient")).toBe(
      `Poids hors zone : +2${NNBSP}kg · Mesure ta taille régulièrement pour suivre ta recompo.`,
    );
  });
});

describe("projectionLabel", () => {
  const today = "2026-10-07";
  it("shows the estimated date", () => {
    expect(
      projectionLabel({ kind: "estimated", date: "2026-11-15", daysRemaining: 39 }, today),
    ).toBe("Atteinte estimée : ~ 15 nov.");
  });
  it("adds the year when it differs", () => {
    expect(
      projectionLabel({ kind: "estimated", date: "2027-03-02", daysRemaining: 146 }, today),
    ).toBe("Atteinte estimée : ~ 2 mars 2027");
  });
  it("handles the far and unavailable cases", () => {
    expect(projectionLabel({ kind: "too_far" }, today)).toBe("Plus de 2 ans au rythme actuel");
    expect(projectionLabel({ kind: "unavailable" }, today)).toBe("Non estimable pour l'instant");
  });
});
