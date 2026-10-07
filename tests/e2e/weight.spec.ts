import { expect, test } from "@playwright/test";

const DEMO_EMAIL = "demo@my-body.test";

test("E2E-2: the demo account logs a weighing with + and the home trend changes", async ({
  page,
}, testInfo) => {
  const password = process.env.SEED_DEMO_PASSWORD;
  test.skip(!password, "SEED_DEMO_PASSWORD is not set: run pnpm db:seed first");

  await page.goto("/connexion");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(password as string);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/accueil$/);

  const hero = page.getByTestId("weight-hero");
  const before = (await hero.textContent()) ?? "";
  const trend = Number(before.replace(",", "."));
  // 3 % away from the trend: visible effect, below the 5 % suspicious threshold.
  // Opposite directions so the mobile and desktop runs (same account, run in parallel) both move it.
  const factor = testInfo.project.name === "mobile" ? 0.97 : 1.03;
  const typed = (trend * factor).toFixed(1).replace(".", ",");

  await page.getByRole("button", { name: "Nouvelle pesée" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouvelle pesée" });
  await dialog.getByLabel("Poids", { exact: true }).fill(typed);
  await dialog.getByRole("button", { name: "Enregistrer" }).click();

  // Today may already hold a weighing (other project or previous run): confirm the replacement.
  const saved = page.getByText("Pesée enregistrée");
  const confirm = dialog.getByRole("button", { name: "Confirmer" });
  await expect(saved.or(confirm)).toBeVisible();
  if (await confirm.isVisible()) await confirm.click();

  await expect(saved).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(hero).not.toHaveText(before);
  await expect(page.getByText(new RegExp(`Pesée du jour : ${typed}\\skg`))).toBeVisible();
});
