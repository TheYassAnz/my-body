import { expect, test } from "@playwright/test";
import { GOAL_DISCLAIMER } from "../../src/features/goals/copy";

const PAGES = [
  ["/mentions-legales", "Mentions légales"],
  ["/cgu", "Conditions générales d'utilisation"],
  ["/confidentialite", "Politique de confidentialité"],
] as const;

for (const [path, title] of PAGES) {
  test(`${path}: public, provisional notice, footer, no horizontal scroll`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("Version provisoire");
    const footer = page.getByRole("navigation", { name: "Pages légales" });
    await expect(footer.getByRole("link")).toHaveCount(3);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("the terms carry the same non-medical disclaimer as the Objectif screen", async ({ page }) => {
  await page.goto("/cgu");
  await expect(page.getByText(GOAL_DISCLAIMER)).toBeVisible();
});

test("the sign-up page links the legal pages from its footer and from the consents", async ({
  page,
}) => {
  await page.goto("/inscription");
  await page
    .getByRole("navigation", { name: "Pages légales" })
    .getByRole("link", { name: "Confidentialité" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Politique de confidentialité" }),
  ).toBeVisible();

  await page.goto("/inscription");
  await expect(page.getByRole("link", { name: "En savoir plus" })).toHaveAttribute(
    "href",
    "/confidentialite",
  );
  await expect(
    page.getByRole("link", { name: "conditions générales d'utilisation" }),
  ).toHaveAttribute("href", "/cgu");
});
