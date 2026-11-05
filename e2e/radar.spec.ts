import { expect, test } from "@playwright/test";
import { loadDemo, openAppNav } from "./helpers";

// Every test starts with empty browser storage (Playwright gives each test a new context).

test("first visit shows the empty dashboard with next steps", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Nothing here yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try the demo" })).toBeVisible();
});

test("demo fills the dashboard and can be exited", async ({ page }) => {
  await loadDemo(page);
  await expect(page.getByRole("heading", { name: "Openings for you" })).toBeVisible();
  await expect(page.getByText("100% fit").first()).toBeVisible();
  await expect(page.getByText("Couldn't reach site 3 times. Check the link.")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Exit demo" }).click();
  await expect(page.getByRole("heading", { name: "Nothing here yet" })).toBeVisible();
});

test("paste a post, check the details, save, and track it", async ({ page }) => {
  await page.goto("/openings/new");
  await page.getByLabel("Company").fill("Nimbus Labs");
  await page.getByLabel("Job post").fill(
    "We're hiring: Frontend Intern (React)\nLahore · Hybrid\nReact, JavaScript and Git.\nDeadline: 05/11\nSend your CV to careers@nimbuslabs.pk",
  );
  await page.getByRole("button", { name: "Read post" }).click();

  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Frontend Intern (React)");
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("Lahore");
  await expect(page.getByText(/could mean more than one date/)).toBeVisible();

  await page.getByLabel("I've checked this date").check();
  await page.getByRole("button", { name: "Save opening" }).click();
  await expect(page).toHaveURL(/\/openings\/detail\?id=/);
  await expect(page.getByRole("heading", { name: "Frontend Intern (React)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply by email" })).toHaveAttribute("href", /^mailto:careers@nimbuslabs\.pk/);

  await page.getByRole("button", { name: "Mark applied" }).click();
  await expect(page.getByText("Status changed to Applied.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Track" }).getByText("Applied", { exact: true }).first()).toBeVisible();
});

test("form rejects a javascript: link instead of saving it", async ({ page }) => {
  await page.goto("/openings/new");
  await page.getByLabel("Company").fill("Acme");
  await page.getByLabel("Job post").fill("Developer intern\nApply at the link");
  await page.getByRole("button", { name: "Read post" }).click();
  await page.getByLabel("Apply link").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save opening" }).click();
  await expect(page.getByText(/full link starting with http/)).toBeVisible();
  await expect(page).toHaveURL(/\/openings\/new/);
});

test("a script inside a pasted post is shown as text and never runs", async ({ page }) => {
  let dialogs = 0;
  page.on("dialog", (d) => {
    dialogs++;
    void d.dismiss();
  });
  await page.goto("/openings/new");
  await page.getByLabel("Company").fill("Evil Co");
  await page.getByLabel("Job post").fill('Developer <img src=x onerror="alert(1)"><script>alert(2)</script>');
  await page.getByRole("button", { name: "Read post" }).click();
  await page.getByRole("button", { name: "Save opening" }).click();
  await expect(page.locator("pre")).toContainText("<script>alert(2)</script>");
  expect(dialogs).toBe(0);
});

test("filters combine, and an empty result offers Clear filters", async ({ page }) => {
  await loadDemo(page);
  await page.goto("/openings");
  await expect(page.getByText("Showing 6 of 7 openings")).toBeVisible();
  const more = page.getByRole("button", { name: /^Filters/ });
  if (await more.isVisible()) await more.click();
  await page.getByLabel("City").selectOption("Lahore");
  await expect(page.getByText("Showing 2 of 7 openings")).toBeVisible();
  await page.getByLabel("City").selectOption("Quetta");
  await expect(page.getByText("No openings match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).last().click();
  await expect(page.getByText("Showing 6 of 7 openings")).toBeVisible();
});

test("CSV export downloads every opening", async ({ page }) => {
  await loadDemo(page);
  await page.goto("/openings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^radar-openings-\d{4}-\d{2}-\d{2}\.csv$/);
});

test("damaged saved data shows a clear error and can be reset", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("radar:v1", "{broken"));
  await page.goto("/dashboard");
  await expect(page.getByText("Radar's saved data is damaged and can't be read.")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByRole("heading", { name: "Nothing here yet" })).toBeVisible();
});

test("navigation works on every screen size and marks the current page", async ({ page }) => {
  await loadDemo(page);
  await openAppNav(page);
  await page.getByRole("link", { name: "Companies" }).click();
  await expect(page.getByRole("heading", { name: "Software houses you're watching" })).toBeVisible();
  await openAppNav(page);
  await expect(page.getByRole("link", { name: "Companies" })).toHaveAttribute("aria-current", "page");
});

test("keyboard users can skip straight to the content", async ({ page, isMobile }) => {
  test.skip(isMobile, "Tab navigation is a desktop concern");
  await page.goto("/dashboard");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("unknown pages show the 404 screen", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Nothing on the radar here" })).toBeVisible();
});
