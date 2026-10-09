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

test("E2E-3: guided session, 3 zones typed, 1 skipped, quit, resume → the silhouette shows the values", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "E2E-3 runs on mobile only (specs/09 §4)");
  await signIn(page);

  await page.goto("/corps/seance");
  // A re-run the same day resumes mid-session: go back to the first zone.
  const first = page.getByText("1 / 8", { exact: true });
  while (!(await first.isVisible())) {
    await page.getByRole("button", { name: /Zone précédente/ }).click();
  }

  await expect(page.getByRole("heading", { name: "Cou" })).toBeVisible();
  await page.getByLabel("Mesure").fill("38,2");
  await page.getByRole("button", { name: /Zone suivante/ }).click();

  await expect(page.getByRole("heading", { name: "Épaules" })).toBeVisible();
  await page.getByRole("button", { name: "Passer cette zone" }).click();

  await expect(page.getByRole("heading", { name: "Poitrine" })).toBeVisible();
  await page.getByLabel("Mesure").fill("101,4");
  await page.getByRole("button", { name: /Zone suivante/ }).click();

  // Abandon on the 4th zone: what was saved stays.
  await expect(page.getByRole("heading", { name: "Bras" })).toBeVisible();
  await page.getByRole("link", { name: /Quitter/ }).click();
  await expect(page).toHaveURL(/\/corps$/);

  await expect(page.getByRole("button", { name: /^Cou : 38,2/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Poitrine : 101,4/ })).toBeVisible();

  // Resume: starts at the first zone without a value today (Épaules), values are kept.
  await page.getByRole("link", { name: "Nouvelle séance de mesure" }).click();
  await expect(page.getByText("2 / 8", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Épaules" })).toBeVisible();
  await page.getByRole("button", { name: /Zone précédente/ }).click();
  await expect(page.getByLabel("Mesure")).toHaveValue("38,2");
});

test("E2E-4: touching the waist on the silhouette opens the input, then the delta is updated", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/corps");

  await page.getByRole("button", { name: /^Taille/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Comment mesurer")).toBeVisible();
  await page.getByLabel("Mesure").fill("80,0");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  // A re-run the same day asks before replacing today's value.
  const confirm = page.getByRole("button", { name: "Confirmer" });
  // (isVisible does not wait, so wait for the alert explicitly.)
  await confirm.click({ timeout: 1500 }).catch(() => {});

  await expect(page.getByText("Mesure enregistrée")).toBeVisible();
  const waist = page.getByRole("button", { name: /^Taille : 80,0.cm/ });
  await expect(waist).toBeVisible();
  // The seeded waist was ~91 cm a month ago: a clear decrease, favourable for the loss goal.
  await expect(waist).toHaveAccessibleName(/moins \d+,\d.cm sur 30 jours/);
});
