import { expect, test, type Page } from "@playwright/test";

const DEMO_EMAIL = "demo@my-body.test";

async function signIn(page: Page) {
  const password = process.env.SEED_DEMO_PASSWORD;
  test.skip(!password, "SEED_DEMO_PASSWORD is not set: run pnpm db:seed first");
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(password as string);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/accueil$/);
}

test("landing: pitch, three pillars, fictional preview, both buttons, legal footer, no horizontal scroll", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Commencer gratuitement" })).toHaveAttribute(
    "href",
    "/inscription",
  );
  await expect(page.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
    "href",
    "/connexion",
  );
  for (const pillar of ["Tendance", "Silhouette", "Rythme"]) {
    await expect(page.getByRole("heading", { level: 3, name: pillar })).toBeVisible();
  }
  await expect(page.getByRole("figure", { name: /aperçu de l'application/i })).toContainText(
    "données fictives",
  );
  await expect(
    page.getByRole("navigation", { name: "Pages légales" }).getByRole("link"),
  ).toHaveCount(3);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("landing: the buttons lead to the sign-up and sign-in pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Commencer gratuitement" }).click();
  await expect(page).toHaveURL(/\/inscription$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
});

// Read-only on the shared demo account (it only signs in).
test("landing: a signed-in visitor is sent to the app", async ({ page }) => {
  await signIn(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/accueil$/);
});
