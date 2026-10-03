import { expect, test } from "@playwright/test";

test("public home page shows the product name and sign-up link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "my-body" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Commencer gratuitement" })).toHaveAttribute(
    "href",
    "/inscription",
  );
});
