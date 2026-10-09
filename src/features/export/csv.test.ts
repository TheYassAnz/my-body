import { describe, expect, it } from "vitest";
import { csvCell, measuresCsv, toCsv, weightsCsv } from "./csv";

describe("csvCell", () => {
  it("leaves plain text and numbers alone", () => {
    expect(csvCell("Après le sport")).toBe("Après le sport");
    expect(csvCell(78.4)).toBe("78.4");
    expect(csvCell(-2)).toBe("-2"); // a number, not text: never prefixed
  });

  it("writes an empty cell for null", () => {
    expect(csvCell(null)).toBe("");
  });

  it.each(['=HYPERLINK("http://x")', "+1", "-2", "@cmd", "\tx", "\rx"])(
    "neutralises the formula %j",
    (text) => {
      expect(csvCell(text)).toMatch(/^"?'/);
    },
  );

  it("prefixes with an apostrophe before quoting", () => {
    expect(csvCell("=1;2")).toBe(`"'=1;2"`);
  });

  it("quotes cells containing the separator, quotes or line breaks", () => {
    expect(csvCell("a;b")).toBe(`"a;b"`);
    expect(csvCell('dit "oui"')).toBe(`"dit ""oui"""`);
    expect(csvCell("ligne1\nligne2")).toBe(`"ligne1\nligne2"`);
  });
});

describe("toCsv", () => {
  it("starts with a BOM, separates with ; and ends each line with CRLF", () => {
    expect(
      toCsv(
        ["a", "b"],
        [
          [1, "x"],
          [2, null],
        ],
      ),
    ).toBe("﻿a;b\r\n1;x\r\n2;\r\n");
  });

  it("writes the header alone when there is no row", () => {
    expect(toCsv(["a", "b"], [])).toBe("﻿a;b\r\n");
  });
});

describe("weightsCsv", () => {
  it("writes date, kilograms, body fat and note, whatever the display unit", () => {
    const csv = weightsCsv([
      { date: "2026-10-01", weightKg: 78.4, bodyFatPct: 21.5, note: "Matin" },
      { date: "2026-10-02", weightKg: 78, bodyFatPct: null, note: null },
      { date: "2026-10-03", weightKg: 77.9, bodyFatPct: null, note: "=2+2" },
    ]);

    expect(csv).toBe(
      "﻿date;poids_kg;masse_grasse_pct;note\r\n" +
        "2026-10-01;78.4;21.5;Matin\r\n" +
        "2026-10-02;78;;\r\n" +
        "2026-10-03;77.9;;'=2+2\r\n",
    );
  });
});

describe("measuresCsv", () => {
  it("writes date, zone key and centimetres", () => {
    const csv = measuresCsv([
      { id: "1", sessionId: "s", date: "2026-10-01", zone: "waist", valueCm: 85.5 },
    ]);
    expect(csv).toBe("﻿date;zone;valeur_cm\r\n2026-10-01;waist;85.5\r\n");
  });
});
