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

// Same demo account as the other specs: edits must not interleave with each other.
test.describe("progress: editing the shared demo account", () => {
  test.describe.configure({ mode: "serial" });

  test("editing the latest weighing changes that row and the home trend", async ({
    page,
  }, testInfo) => {
    await signIn(page);
    const hero = page.getByTestId("weight-hero");
    const before = (await hero.textContent()) ?? "";

    await page.goto("/progres");
    const history = page.getByRole("region", { name: "Historique" });
    const latest = history.getByRole("button").first();
    const text = (await latest.textContent()) ?? "";
    const current = Number(text.match(/(\d+,\d)\s*kg/)?.[1].replace(",", "."));
    // Small step (stays under the 5 % suspicious-value threshold against the trend), opposite
    // directions per project (same account, run one after the other).
    const typed = (current * (testInfo.project.name === "mobile" ? 0.985 : 1.015))
      .toFixed(1)
      .replace(".", ",");

    await latest.click();
    const dialog = page.getByRole("dialog", { name: "Modifier la pesée" });
    await dialog.getByLabel("Poids", { exact: true }).fill(typed);
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    // The suspicious-value confirmation (EF-WGT-03) may still apply depending on the seed noise.
    const confirm = dialog.getByRole("button", { name: "Confirmer", exact: true });
    await confirm.or(page.getByText("Modification enregistrée")).first().waitFor();
    if (await confirm.isVisible()) await confirm.click();
    await expect(page.getByText("Modification enregistrée")).toBeVisible();
    await expect(dialog).toBeHidden();

    // The edited row now shows the new value (same date, so it is still the first row).
    await expect(history.getByRole("button").first()).toContainText(new RegExp(`${typed}\\s*kg`));

    await page.goto("/accueil");
    await expect(hero).not.toHaveText(before);
  });

  test("deleting a measurement then Annuler brings the row back", async ({ page }) => {
    await signIn(page);
    await page.goto("/progres?m=waist");

    const history = page.getByRole("region", { name: "Historique" });
    const first = history.getByRole("listitem").first();
    // Identify the row by its own text (date + value), not by the list length.
    const label = ((await first.textContent()) ?? "").trim();
    expect(label).not.toBe("");
    const row = history.getByRole("listitem").filter({ hasText: label });

    await first.getByRole("button").click();
    const dialog = page.getByRole("dialog", { name: /Modifier/ });
    await dialog.getByRole("button", { name: "Supprimer" }).click();
    await dialog.getByRole("button", { name: "Confirmer la suppression" }).click();
    await expect(page.getByText("Mesure supprimée")).toBeVisible();
    await expect(row).toHaveCount(0);

    const undo = page.getByRole("button", { name: "Annuler" });
    await expect(undo).toBeFocused();
    await undo.click();
    await expect(row).toHaveCount(1);
  });
});
