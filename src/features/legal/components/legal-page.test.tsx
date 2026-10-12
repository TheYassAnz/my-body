// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LegalDocument } from "../types";
import { LegalPage } from "./legal-page";
import { SiteFooter } from "./site-footer";

afterEach(cleanup);

const DOC: LegalDocument = {
  title: "Titre de test",
  sections: [
    { id: "un", heading: "Première partie", blocks: ["Un paragraphe.", { list: ["a", "b"] }] },
    { id: "deux", heading: "Seconde partie", blocks: ["Autre paragraphe."] },
  ],
};

describe("LegalPage", () => {
  it("renders the title, the provisional notice with a long French date, and the sections", () => {
    render(<LegalPage document={DOC} updatedOn="2026-10-09" />);

    expect(screen.getByRole("heading", { level: 1, name: "Titre de test" })).toBeTruthy();
    const note = screen.getByRole("note");
    expect(note.textContent).toContain("Version provisoire");
    expect(note.textContent).toContain("validation juridique");
    expect(note.textContent).toContain("9 octobre 2026");
    expect(screen.getByRole("heading", { level: 2, name: "Première partie" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Seconde partie" })).toBeTruthy();
    expect(screen.getByText("Un paragraphe.")).toBeTruthy();
  });

  it("renders list blocks as lists", () => {
    render(<LegalPage document={DOC} updatedOn="2026-10-09" />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(["a", "b"]);
  });

  it("links every section heading to its id and ends with the public footer", () => {
    const { container } = render(<LegalPage document={DOC} updatedOn="2026-10-09" />);
    expect(container.querySelector("#un")).toBeTruthy();
    expect(container.querySelector("#deux")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mentions légales" })).toBeTruthy();
  });
});

describe("SiteFooter", () => {
  it("links the three legal pages", () => {
    render(<SiteFooter />);
    const nav = screen.getByRole("navigation", { name: "Pages légales" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Mentions légales", "/mentions-legales"],
      ["CGU", "/cgu"],
      ["Confidentialité", "/confidentialite"],
    ]);
  });
});
