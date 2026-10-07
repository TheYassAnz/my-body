import { describe, expect, it } from "vitest";
import { sparklineGeometry } from "./sparkline";

const base = { from: "2026-07-06", to: "2026-10-03" };

describe("sparklineGeometry", () => {
  it("maps the first and last day to the padded edges and heavier to higher on screen", () => {
    const g = sparklineGeometry(
      {
        ...base,
        dots: [
          { date: "2026-07-06", weightKg: 82 },
          { date: "2026-10-03", weightKg: 78 },
        ],
        trend: [],
      },
      320,
      72,
    );
    expect(g.dots[0]).toEqual({ cx: 4, cy: 4 });
    expect(g.dots[1]).toEqual({ cx: 316, cy: 68 });
  });

  it("draws the daily trend as one path", () => {
    const g = sparklineGeometry(
      {
        ...base,
        dots: [],
        trend: [
          { date: "2026-07-06", trendKg: 80 },
          { date: "2026-10-03", trendKg: 79 },
        ],
      },
      320,
      72,
    );
    expect(g.trendPath).toBe("M4 4 L316 68");
  });

  it("centres a flat series and handles no data", () => {
    const flat = sparklineGeometry(
      { ...base, dots: [{ date: "2026-10-03", weightKg: 80 }], trend: [] },
      320,
      72,
    );
    expect(flat.dots[0].cy).toBe(36);
    expect(sparklineGeometry({ ...base, dots: [], trend: [] }, 320, 72)).toEqual({
      dots: [],
      trendPath: "",
    });
  });
});
