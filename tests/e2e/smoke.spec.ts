import { expect, test } from "@playwright/test";

test("public home page shows the pitch and the sign-up link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Comprends ce que ton poids veut dire",
  );
  await expect(page.getByRole("link", { name: "Commencer gratuitement" })).toHaveAttribute(
    "href",
    "/inscription",
  );
});
