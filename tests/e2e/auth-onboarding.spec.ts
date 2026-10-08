import { expect, test } from "@playwright/test";

const PASSWORD = "correct-horse-battery";

test("sign up, consent, onboarding, sign out and sign in again", async ({ page }, testInfo) => {
  const email = `e2e-${Date.now()}-${testInfo.project.name}@example.com`;

  await page.goto("/inscription");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  // Consents are unticked by default: the form must refuse.
  await expect(
    page.getByText("Ce consentement est nécessaire pour suivre ta progression"),
  ).toBeVisible();
  // The email is kept after an error; the password is never sent back, so it is typed again.
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);

  await page.getByLabel(/données de santé/).check();
  await page.getByLabel(/conditions générales/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Femme").check();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.getByLabel(/Taille/).fill("168");
  await page.getByLabel("Date de naissance").fill("1990-04-12");
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page.getByRole("heading", { name: "Quel est ton poids actuel ?" })).toBeVisible();
  await page.getByLabel("Poids", { exact: true }).fill("70,4");
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page.getByRole("heading", { name: "Quel est ton objectif ?" })).toBeVisible();
  await page.getByRole("button", { name: "Juste suivre mon poids" }).click();

  await expect(page).toHaveURL(/\/accueil$/);
  await expect(page.getByRole("heading", { name: "Bonjour" })).toBeVisible();
  await expect(page.getByText("Tendance en calibrage · encore 6 pesées")).toBeVisible();
  await expect(page.getByTestId("weight-hero")).toHaveText("70,4");
  await expect(
    page.getByText("Confirme ton email pour pouvoir récupérer ton compte."),
  ).toBeVisible();

  await page.goto("/reglages");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/accueil$/);
});

test("refuses users younger than 16 at onboarding", async ({ page }, testInfo) => {
  const email = `e2e-young-${Date.now()}-${testInfo.project.name}@example.com`;
  await page.goto("/inscription");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByLabel(/données de santé/).check();
  await page.getByLabel(/conditions générales/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByLabel("Homme").check();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.getByLabel(/Taille/).fill("170");
  await page.getByLabel("Date de naissance").fill("2015-01-01");
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page.getByText("my-body est réservé aux 16 ans et plus")).toBeVisible();
  await expect(page).toHaveURL(/\/onboarding$/);
});
