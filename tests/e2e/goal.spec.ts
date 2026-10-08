import { expect, test } from "@playwright/test";

const DEMO_EMAIL = "demo@my-body.test";

test("E2E-5: switching goal type asks for confirmation and keeps the old goal in the history", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "E2E-5 runs on desktop only (specs/09 §4)");
  const password = process.env.SEED_DEMO_PASSWORD;
  test.skip(!password, "SEED_DEMO_PASSWORD is not set: run pnpm db:seed first");

  await page.goto("/connexion");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(password as string);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/accueil$/);

  await page.goto("/objectif");
  const lose = page.getByRole("radio", { name: /Perdre du poids/ });
  const gain = page.getByRole("radio", { name: /Prendre du poids/ });
  // The demo goal is a loss; on a re-run without re-seeding it may already be a gain: switch to the other one.
  const wasLose = await lose.isChecked();
  const [next, previous] = wasLose ? [gain, "Perte"] : [lose, "Prise"];

  const historyItems = page.getByTestId("goal-history").locator("li");
  const before = await historyItems.count();

  // The radio is sr-only: click its visible label text (exact, so the description does not match).
  await page.getByText(wasLose ? "Prendre du poids" : "Perdre du poids", { exact: true }).click();
  await expect(next).toBeChecked();
  const trend = Number((await page.getByLabel("Actuel (tendance)").inputValue()).replace(",", "."));
  const target = (wasLose ? trend + 4 : trend - 4).toFixed(1).replace(".", ",");
  await page.getByLabel("Cible", { exact: true }).fill(target);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  const confirmation = page.getByRole("alert").filter({ hasText: "archive" });
  await expect(confirmation).toBeVisible();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Objectif enregistré")).toBeVisible();

  await page.reload();
  await expect(next).toBeChecked();
  await page.getByText("Historique des objectifs").click();
  await expect(page.getByTestId("goal-history")).toContainText(previous);
  await expect(historyItems).toHaveCount(before + 1);
});
