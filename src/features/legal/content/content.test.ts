import { describe, expect, it } from "vitest";
import { GOAL_DISCLAIMER } from "@/features/goals/copy";
import type { LegalBlock, LegalDocument } from "../types";
import { NOTICE } from "./notice";
import { PRIVACY } from "./privacy";
import { TERMS } from "./terms";

const text = (doc: LegalDocument) =>
  doc.sections
    .flatMap((s) => [
      s.heading,
      ...s.blocks.flatMap((b: LegalBlock) => (typeof b === "string" ? [b] : b.list)),
    ])
    .join("\n");

describe.each([
  ["notice", NOTICE, "Mentions légales"],
  ["terms", TERMS, "Conditions générales d'utilisation"],
  ["privacy", PRIVACY, "Politique de confidentialité"],
])("%s", (_, doc, title) => {
  it("has the expected title and well-formed sections", () => {
    expect(doc.title).toBe(title);
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of doc.sections) {
      expect(s.id).toMatch(/^[a-z-]+$/);
      expect(s.heading.length).toBeGreaterThan(0);
      expect(s.blocks.length).toBeGreaterThan(0);
    }
  });
});

describe("terms (EF-LEGAL-02)", () => {
  it("contains the exact non-medical disclaimer shown on the Objectif screen", () => {
    expect(text(TERMS)).toContain(GOAL_DISCLAIMER);
  });

  it("states the minimum age and that the service is free", () => {
    expect(text(TERMS)).toContain("16 ans");
    expect(text(TERMS)).toMatch(/gratuit/i);
  });
});

describe("privacy (specs/07)", () => {
  const t = text(PRIVACY);

  it.each(["Neon", "Vercel", "Resend", "Google"])("names the processor %s", (name) => {
    expect(t).toContain(name);
  });

  it("does not claim sessions are erased on expiry and discloses the stored name", () => {
    expect(t).not.toContain("à l'expiration de la session");
    expect(t).toContain("issu de ton email");
  });

  it("states the backup window, the minimum age and the supervisory authority", () => {
    expect(t).toContain("7 jours");
    expect(t).toContain("16 ans");
    expect(t).toContain("CNIL");
  });

  it("lists the data rights and how to exercise them", () => {
    expect(t).toMatch(/export/i);
    expect(t).toMatch(/suppression/i);
    expect(t).toMatch(/consentement/i);
  });

  it("says there is a single strictly necessary session cookie and no banner", () => {
    expect(t).toMatch(/cookie de session/i);
    expect(t).toMatch(/sans bandeau|aucun bandeau/i);
  });

  it("says health data is never sold or shared", () => {
    expect(t).toMatch(/ni vendues ni partagées/);
    expect(t).not.toContain("à des fins commerciales");
  });

  it("lists body fat and does not claim that no name is stored", () => {
    expect(t).toContain("pourcentage de masse grasse");
    expect(t).not.toContain("Ni nom");
  });
});

describe("notice", () => {
  it("names the host and the database provider", () => {
    expect(text(NOTICE)).toContain("Vercel");
    expect(text(NOTICE)).toContain("Neon");
  });
});
