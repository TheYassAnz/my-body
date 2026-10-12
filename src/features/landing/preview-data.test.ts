import { describe, expect, it } from "vitest";
import { sparklineGeometry } from "@/features/dashboard/sparkline";
import { deltaTone, ZONES } from "@/lib/metrics";
import { NNBSP } from "@/lib/units";
import {
  PREVIEW_RATE_KG,
  PREVIEW_SPARKLINE,
  PREVIEW_TREND_KG,
  PREVIEW_ZONES,
} from "./preview-data";

describe("landing preview data", () => {
  it("is a fixed, chronological series that draws a real trend line", () => {
    const { dots, trend, from, to } = PREVIEW_SPARKLINE;
    expect(dots.length).toBeGreaterThan(8);
    expect(trend).toHaveLength(dots.length);
    expect([...dots].map((d) => d.date)).toEqual([...dots].map((d) => d.date).sort());
    expect(from <= dots[0].date && dots[dots.length - 1].date <= to).toBe(true);
    expect(sparklineGeometry(PREVIEW_SPARKLINE, 320, 72).trendPath).not.toBe("");
  });

  it("shows a falling trend that matches the headline numbers", () => {
    const trend = PREVIEW_SPARKLINE.trend;
    expect(trend[trend.length - 1].trendKg).toBe(PREVIEW_TREND_KG);
    expect(trend[0].trendKg).toBeGreaterThan(PREVIEW_TREND_KG);
    expect(PREVIEW_RATE_KG).toBeLessThan(0);
  });

  it("gives a weekly rate close to the slope of the drawn trend", () => {
    const t = PREVIEW_SPARKLINE.trend;
    const ms = Date.parse(t[t.length - 1].date) - Date.parse(t[0].date);
    const slope = (t[t.length - 1].trendKg - t[0].trendKg) / (ms / (7 * 86_400_000));
    expect(Math.abs(PREVIEW_RATE_KG - slope)).toBeLessThanOrEqual(0.05);
  });

  it("formats measured zones with the project formatters and recomposition tones", () => {
    for (const z of PREVIEW_ZONES.filter((v) => v.valueText !== null)) {
      expect(z.valueText).toContain(`${NNBSP}cm`);
      expect(z.deltaText).toContain(`${NNBSP}cm`);
    }
    const waist = PREVIEW_ZONES.find((z) => z.zone === "waist");
    expect(waist?.tone).toBe(deltaTone("waist", -3.5, "recomp"));
    expect(waist?.tone).toBe("positive");
    expect(waist?.ariaLabel).toBe(`Taille : 81,5${NNBSP}cm, moins 3,5${NNBSP}cm sur 30 jours`);
    expect(PREVIEW_ZONES.find((z) => z.zone === "chest")?.tone).toBe("neutral");
  });

  it("covers the eight zones, some measured and some not, with the project's labels", () => {
    expect(PREVIEW_ZONES.map((z) => z.zone)).toEqual([...ZONES]);
    const measured = PREVIEW_ZONES.filter((z) => z.valueText !== null);
    expect(measured.length).toBeGreaterThanOrEqual(4);
    expect(measured.length).toBeLessThan(ZONES.length);
    for (const z of PREVIEW_ZONES) expect(z.ariaLabel).toContain(z.label);
  });
});
