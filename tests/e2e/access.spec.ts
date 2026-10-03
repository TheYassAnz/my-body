import { expect, test } from "@playwright/test";

test("E2E-9: a visitor without session is sent to sign-in with the target page", async ({
  page,
}) => {
  await page.goto("/accueil");
  await expect(page).toHaveURL(/\/connexion\?next=%2Faccueil$/);
  await expect(page.getByRole("heading", { name: "Se connecter" })).toBeVisible();
});

test("protected settings page also requires a session", async ({ page }) => {
  await page.goto("/reglages");
  await expect(page).toHaveURL(/\/connexion\?next=%2Freglages$/);
});
