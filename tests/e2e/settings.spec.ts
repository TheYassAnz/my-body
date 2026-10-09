import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createAccount } from "./support";

const DEMO_EMAIL = "demo@my-body.test";

test("E2E-6: switching to lb shows weights in lb on the home, the entry sheet and Progrès", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "E2E-6 runs on mobile");
  await createAccount(page, "units", testInfo);

  await page.goto("/reglages");
  const units = page.getByRole("form", { name: "Unités" });
  await units.getByRole("group", { name: "Poids" }).getByText("lb", { exact: true }).click();
  await units.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Unités enregistrées")).toBeVisible();

  // 70,4 kg stored → 155,2 lb displayed; nothing was rewritten.
  await page.goto("/accueil");
  await expect(page.getByTestId("weight-hero")).toHaveText("155,2");

  await page.getByRole("button", { name: "Nouvelle pesée" }).click();
  await expect(page.getByRole("dialog").getByText("lb", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/progres");
  await expect(page.getByRole("region", { name: "Historique" })).toContainText(/155,2\s*lb/);
});

test("E2E-7: the CSV export downloads a non-empty file with a BOM and the right header", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "E2E-7 runs on desktop");
  const password = process.env.SEED_DEMO_PASSWORD;
  test.skip(!password, "SEED_DEMO_PASSWORD is not set: run pnpm db:seed first");
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(password as string);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/accueil$/);

  await page.goto("/reglages");
  const [weights] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Exporter les pesées" }).click(),
  ]);
  expect(weights.suggestedFilename()).toBe("pesees.csv");
  const weightsText = await readFile((await weights.path()) as string, "utf8");
  expect(weightsText.startsWith("﻿date;poids_kg;masse_grasse_pct;note\r\n")).toBe(true);
  expect(weightsText.split("\r\n").length).toBeGreaterThan(10);

  const [measures] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Exporter les mensurations" }).click(),
  ]);
  expect(measures.suggestedFilename()).toBe("mensurations.csv");
  const measuresText = await readFile((await measures.path()) as string, "utf8");
  expect(measuresText.startsWith("﻿date;zone;valeur_cm\r\n")).toBe(true);
  expect(measuresText.length).toBeGreaterThan("﻿date;zone;valeur_cm\r\n".length);

  // Signed in (the proxy redirects visitors first), an unknown export is a 404.
  expect((await page.request.get("/reglages/export/autre")).status()).toBe(404);
});

test("E2E-7: the export redirects a signed-out visitor to sign-in", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "E2E-7 runs on desktop");
  await page.goto("/reglages/export/pesees");
  await expect(page).toHaveURL(/\/connexion/);
});

test("E2E-8: deleting the account signs out and the credentials stop working", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "E2E-8 runs on desktop");
  const { email, password } = await createAccount(page, "delete", testInfo);
  await page.goto("/reglages");

  const form = page.getByRole("form", { name: "Suppression du compte" });
  // A mistyped confirmation must not delete anything.
  await form.getByLabel(/saisis SUPPRIMER/).fill("supprimer");
  await form.getByLabel("Mot de passe").fill(password);
  await form.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(form.getByText("Saisis SUPPRIMER pour confirmer")).toBeVisible();
  await page.goto("/accueil");
  await expect(page).toHaveURL(/\/accueil$/);

  await page.goto("/reglages");
  const confirm = page.getByRole("form", { name: "Suppression du compte" });
  await confirm.getByLabel(/saisis SUPPRIMER/).fill("SUPPRIMER");
  await confirm.getByLabel("Mot de passe").fill(password);
  await confirm.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/reglages");
  await expect(page).toHaveURL(/\/connexion/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Email ou mot de passe incorrect")).toBeVisible();
  await expect(page).toHaveURL(/\/connexion/);
});
