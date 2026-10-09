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
  // A re-run the same day resumes mid-session: step back to the first zone, one awaited step at a time.
  const progress = page.getByRole("progressbar", { name: "Progression de la séance" });
  await expect(progress).toBeVisible();
  const resumedAt = Number(await progress.getAttribute("aria-valuenow"));
  for (let at = resumedAt; at > 1; at--) {
    await page.getByRole("button", { name: /Zone précédente/ }).click();
    await expect(progress).toHaveAttribute("aria-valuenow", String(at - 1));
  }

  await expect(page.getByRole("heading", { name: "Cou" })).toBeVisible();
  await page.getByLabel("Mesure").fill("38,2");
  await page.getByRole("button", { name: /Zone suivante/ }).click();

  await expect(page.getByRole("heading", { name: "Épaules" })).toBeVisible();
  await page.getByRole("button", { name: "Passer cette zone" }).click();

  await expect(page.getByRole("heading", { name: "Poitrine" })).toBeVisible();
  await page.getByLabel("Mesure").fill("101,4");
  await page.getByRole("button", { name: /Zone suivante/ }).click();

  await expect(page.getByRole("heading", { name: "Bras" })).toBeVisible();
  await page.getByLabel("Mesure").fill("35,6");
  await page.getByRole("button", { name: /Zone suivante/ }).click();

  // Abandon on the 5th zone: what was saved stays.
  await expect(page.getByRole("heading", { name: "Taille" })).toBeVisible();
  await page.getByRole("link", { name: /Quitter/ }).click();
  await expect(page).toHaveURL(/\/corps$/);

  await expect(page.getByRole("button", { name: /^Cou : 38,2/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Poitrine : 101,4/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Bras : 35,6/ })).toBeVisible();

  // Resume: starts at the first zone without a value today (Épaules), values are kept.
  await page.getByRole("link", { name: "Nouvelle séance de mesure" }).click();
  await expect(page.getByRole("progressbar", { name: "Progression de la séance" })).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
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
  // A re-run the same day asks before replacing today's value; a fresh DB goes straight to the toast.
  // Not getByRole("alert") alone: the Next route announcer is one too.
  const alert = page.getByRole("dialog").getByRole("alert");
  const toast = page.getByText("Mesure enregistrée");
  await expect(alert.or(toast)).toBeVisible();
  if (await alert.isVisible()) {
    await expect(alert).toHaveText(/Remplacer/);
    await page.getByRole("button", { name: "Confirmer" }).click();
  }
  await expect(toast).toBeVisible();
  const waist = page.getByRole("button", { name: /^Taille : 80,0.cm/ });
  await expect(waist).toBeVisible();
  // The seeded waist was ~91 cm a month ago: a clear decrease, favourable for the loss goal.
  await expect(waist).toHaveAccessibleName(/moins \d+,\d.cm sur 30 jours/);
});
