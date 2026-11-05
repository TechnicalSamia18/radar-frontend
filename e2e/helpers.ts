import { expect, type Page } from "@playwright/test";
import companies from "./fixtures/companies.json";
import openings from "./fixtures/openings.json";

/**
 * Serves a small, fixed copy of the watcher's files instead of the real
 * (daily-changing) ones, so tests always see the same live data.
 * Folio3's careers page is marked as changed today. The check time defaults
 * to "now" so the out-of-date warning only appears when a test asks for it.
 */
export async function mockFeed(page: Page, { fail = false, checkedAt = new Date().toISOString() } = {}) {
  await page.route("**/feed/openings.json", (route) => (fail ? route.abort() : route.fulfill({ json: { ...openings, generatedAt: checkedAt } })));
  await page.route("**/feed/companies.json", (route) =>
    fail
      ? route.abort()
      : route.fulfill({
          json: { ...companies, generatedAt: checkedAt, companies: companies.companies.map((c) => (c.name === "Folio3" ? { ...c, pageChangedAt: new Date().toISOString() } : c)) },
        }),
  );
}

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

/** Saves a profile directly, as if the user had filled in the profile page. */
export async function setProfile(page: Page, skills: string[]) {
  await page.goto("/");
  await page.evaluate((skills) => {
    localStorage.setItem(
      "radar:v1",
      JSON.stringify({
        version: 1,
        isDemo: false,
        companies: [],
        openings: [],
        profile: { skills, semester: 5, graduationYear: 2028, cgpa: 3.68, cities: ["Islamabad", "Lahore"], remotePreference: "any", seeking: "both", resumeFileName: null, updatedAt: new Date().toISOString() },
      }),
    );
  }, skills);
}
