import { expect, test } from "@playwright/test";
import { loadDemo, mockFeed, openAppNav, setProfile } from "./helpers";

// Every test starts with empty browser storage (Playwright gives each test a new context)
// and sees the same small, fixed live feed.
test.beforeEach(async ({ page }) => {
  await mockFeed(page);
});

test("first visit shows live openings and the next steps", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Live openings for you/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Software Engineer - MERN" })).toBeVisible();
  await expect(page.getByText("Fit unknown").first()).toBeVisible(); // no resume yet
  await expect(page.getByRole("heading", { name: "You're not tracking anything yet" })).toBeVisible();
});

test("demo fills the dashboard and can be exited", async ({ page }) => {
  await loadDemo(page);
  await expect(page.getByRole("heading", { name: "Saved, not applied yet" })).toBeVisible();
  await expect(page.getByText("100% fit").first()).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Exit demo" }).click();
  await expect(page.getByRole("heading", { name: "You're not tracking anything yet" })).toBeVisible();
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

test("an exported backup can be restored in a fresh browser", async ({ page, browser }) => {
  await loadDemo(page);
  await page.goto("/openings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  const file = await download.path();

  const fresh = await browser.newPage();
  await mockFeed(fresh);
  await fresh.goto("/openings");
  await expect(fresh.getByRole("heading", { name: "No openings yet" })).toBeVisible();
  await fresh.locator('input[type="file"]').setInputFiles(file);
  await expect(fresh.getByText("Restored 7 openings.")).toBeVisible();
  await expect(fresh.getByText("Showing 6 of 7 openings")).toBeVisible();
  await fresh.close();
});

test("damaged saved data shows a clear error and can be reset", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("radar:v1", "{broken"));
  await page.goto("/dashboard");
  await expect(page.getByText("Radar's saved data is damaged and can't be read.")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByRole("heading", { name: "You're not tracking anything yet" })).toBeVisible();
});

test("navigation works on every screen size and marks the current page", async ({ page }) => {
  await loadDemo(page);
  await openAppNav(page);
  await page.getByRole("link", { name: "Companies" }).click();
  await expect(page.getByRole("heading", { name: "Software houses on your radar" })).toBeVisible();
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

test("the home page links to the source code", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Source code/ })).toHaveAttribute("href", "https://github.com/TechnicalSamia18/radar-frontend");
});

test("unknown pages show the 404 screen", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Nothing on the radar here" })).toBeVisible();
});

test.describe("live openings from the daily watcher", () => {
  test("are scored against your profile, best fit first, senior roles capped", async ({ page }) => {
    await setProfile(page, ["JavaScript", "React", "Node.js", "Express", "MongoDB", "Git", "HTML", "CSS"]);
    await page.goto("/live");
    await expect(page.getByText("Showing 3 of 3 live openings")).toBeVisible();
    const titles = page.locator("article h3");
    await expect(titles.first()).toContainText("Software Engineer - MERN");
    await expect(titles.first()).toContainText("New");
    const lead = page.locator("article", { hasText: "Lead Support Engineer" });
    await expect(lead.getByText(/so the fit is capped|more/).first()).toBeVisible(); // shown, or behind "+N more"
    await expect(lead).toContainText("(low)"); // senior roles never rate above "low"
    await page.getByLabel("Entry-level only").check();
    await expect(page.getByText("Showing 1 of 3 live openings")).toBeVisible();
  });

  test("can be saved to My openings and tracked", async ({ page }) => {
    await page.goto("/live");
    const card = page.locator("article", { hasText: "Software Engineer (Entry-level)" });
    await card.getByRole("button", { name: "Save to my openings" }).click();
    await card.getByRole("link", { name: /Saved · track it/ }).click();
    await expect(page.getByRole("heading", { name: "Software Engineer (Entry-level)" })).toBeVisible();
    await page.getByRole("button", { name: "Mark applied" }).click();
    await expect(page.getByText("Status changed to Applied.")).toBeVisible();
  });

  test("can be hidden and brought back", async ({ page }) => {
    await page.goto("/live");
    await page.locator("article", { hasText: "Lead Support Engineer" }).getByRole("button", { name: "Not interested" }).click();
    await expect(page.getByText("Showing 2 of 3 live openings")).not.toBeVisible(); // notice replaces the count…
    await expect(page.locator("article")).toHaveCount(2);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.locator("article")).toHaveCount(3);
  });

  test("the dashboard flags careers pages that changed", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Careers pages that changed this week" })).toBeVisible();
    const changed = page.locator("li", { hasText: "Folio3" }).filter({ has: page.getByRole("link", { name: "Have a look" }) });
    await expect(changed).toBeVisible();
  });

  test("companies page shows what the watcher found", async ({ page }) => {
    await page.goto("/companies");
    await expect(page.getByRole("heading", { name: /Checked every morning \(6\)/ })).toBeVisible();
    await expect(page.getByText(/live openings? · Workable/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Add a company to watch/ })).toHaveAttribute("href", /github\.com\/.*data\/companies\.json/);
  });

  test("warns when the daily check looks stopped", async ({ page }) => {
    await page.unrouteAll();
    await mockFeed(page, { checkedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() });
    await page.goto("/live");
    await expect(page.getByText("Live openings may be out of date")).toBeVisible();
    await expect(page.getByText(/last checked 5 days ago/)).toBeVisible();
  });

  test("a feed that can't load shows an error with Try again", async ({ page }) => {
    await page.unrouteAll();
    await mockFeed(page, { fail: true });
    await page.goto("/live");
    await expect(page.getByText("Couldn't load live openings. Check your connection and try again.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
