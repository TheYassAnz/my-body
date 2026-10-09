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

test("progress: period and metric live in the URL, the history can load more", async ({ page }) => {
  await signIn(page);
  await page.goto("/progres");

  await page.getByRole("link", { name: "1A", exact: true }).click();
  await expect(page).toHaveURL(/[?&]p=1a/);
  await expect(page.getByRole("link", { name: "1A", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await page.getByRole("link", { name: "Taille", exact: true }).click();
  await expect(page).toHaveURL(/[?&]m=waist/);
  await expect(page).toHaveURL(/[?&]p=1a/);
  await expect(page.getByRole("link", { name: "Taille", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.getByRole("heading", { name: "Historique" })).toBeVisible();

  // The demo seed holds ~100 weighings (120 days, ~15 % skipped): more than one page of 50 rows.
  await page.getByRole("link", { name: "Poids", exact: true }).click();
  const rows = page.getByRole("region", { name: "Historique" }).getByRole("listitem");
  await expect(rows).toHaveCount(50);
  await page.getByRole("link", { name: "Charger plus" }).click();
  await expect(page).toHaveURL(/[?&]n=100/);
  await expect(async () => expect(await rows.count()).toBeGreaterThan(50)).toPass();
});

test("progress: editing the latest weighing changes the home trend", async ({ page }, testInfo) => {
  await signIn(page);
  const hero = page.getByTestId("weight-hero");
  const before = (await hero.textContent()) ?? "";

  await page.goto("/progres");
  const latest = page.getByRole("region", { name: "Historique" }).getByRole("button").first();
  const current = Number(
    ((await latest.textContent()) ?? "").match(/(\d+,\d)\s*kg/)?.[1].replace(",", "."),
  );
  // 3 % away, opposite directions per project (same account, run one after the other).
  const typed = (current * (testInfo.project.name === "mobile" ? 0.97 : 1.03))
    .toFixed(1)
    .replace(".", ",");

  await latest.click();
  const dialog = page.getByRole("dialog", { name: "Modifier la pesée" });
  await dialog.getByLabel("Poids", { exact: true }).fill(typed);
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Modification enregistrée")).toBeVisible();
  await expect(dialog).toBeHidden();

  await page.goto("/accueil");
  await expect(hero).not.toHaveText(before);
});

test("progress: deleting a measurement then Annuler brings the row back", async ({ page }) => {
  await signIn(page);
  await page.goto("/progres?m=waist");

  const rows = page.getByRole("region", { name: "Historique" }).getByRole("listitem");
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);

  await rows.first().getByRole("button").click();
  const dialog = page.getByRole("dialog", { name: /Modifier/ });
  await dialog.getByRole("button", { name: "Supprimer" }).click();
  await dialog.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByText("Mesure supprimée")).toBeVisible();
  await expect(rows).toHaveCount(count - 1);

  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(rows).toHaveCount(count);
});
