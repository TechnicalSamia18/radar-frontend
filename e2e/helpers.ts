import { expect, type Page } from "@playwright/test";

/** Opens a fresh Radar with the fictional demo data loaded. */
export async function loadDemo(page: Page) {
  await page.goto("/demo");
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("sample data").first()).toBeVisible();
}

/** Opens the app menu on phones; does nothing on desktop. */
export async function openAppNav(page: Page) {
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
}
