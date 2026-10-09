import { describe, expect, it } from "vitest";
import { buildHistory } from "./history-rows";

const weights = Array.from({ length: 120 }, (_, i) => ({
  id: String(i),
  userId: "u",
  date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
  weightKg: 80,
  bodyFatPct: i % 2 ? 20 : null,
  note: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
const base = {
  weightUnit: "kg",
  lengthUnit: "cm",
  data: { weights, measures: [] as never[] },
} as const;

describe("buildHistory", () => {
  it("sorts newest first and cuts to rows with the total", () => {
    const h = buildHistory({ ...base, metric: "weight", rows: 50 });
    expect(h.items).toHaveLength(50);
    expect(h.total).toBe(120);
    expect(h.items[0].date > h.items[1].date).toBe(true);
  });
  it("body fat keeps only weighings that have one", () => {
    const h = buildHistory({ ...base, metric: "bodyFat", rows: 50 });
    expect(h.total).toBe(60);
    expect(h.items[0].label).toBe("20,0 %");
  });
});
