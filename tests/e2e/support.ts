import { expect, type Page, type TestInfo } from "@playwright/test";

export const PASSWORD = "correct-horse-battery";

/** Fresh account through the real sign-up and onboarding; ends on /accueil with one weighing (70,4 kg). */
export async function createAccount(page: Page, tag: string, testInfo: TestInfo) {
  const email = `e2e-${tag}-${Date.now()}-${testInfo.project.name}@example.com`;
  await page.goto("/inscription");
  await page.getByLabel("Email").fill(email);
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
  await page.getByLabel("Poids", { exact: true }).fill("70,4");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Juste suivre mon poids" }).click();
  await page.getByRole("button", { name: "Plus tard" }).click();
  await expect(page).toHaveURL(/\/accueil$/);
  return { email, password: PASSWORD };
}
