import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  await request.post("/api/dev/reset");
});

test("onboarding builds a plan and re-planning preserves history", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByRole("heading", { name: /your plan starts here/i })).toBeVisible();

  // Target: April 8 2027 (default), goal 175, enter a diagnostic 20/19/18
  await page.getByLabel("I haven't taken a diagnostic yet", { exact: false }).click(); // turn OFF skip
  await page.getByLabel("LR 1 correct").fill("20");
  await page.getByLabel("LR 2 correct").fill("19");
  await page.getByLabel("RC correct").fill("18");
  await expect(page.getByText(/Estimated 1\d\d/)).toBeVisible();

  await page.getByRole("button", { name: /build my plan/i }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Test day Apr 8, 2027/ })).toBeVisible();

  // Five phases in the strip; protect phase ends the day before the test
  const strip = page.locator("[title*='→']");
  await expect(strip).toHaveCount(5);
  await expect(page.getByText(/Final week — protect the score: .*Apr 7/)).toBeVisible();

  // Mark today done
  await page.getByRole("button", { name: /mark done/i }).click();
  await expect(page.getByRole("button", { name: /^completed$/i })).toBeVisible();

  // Re-plan to June 9 2027
  await page.getByRole("button", { name: /change date or hours/i }).click();
  await page.getByLabel("Test date").fill("2027-06-09");
  await page.getByRole("button", { name: /^re-plan$/i }).click();
  await expect(page.getByRole("heading", { name: /Test day Jun 9, 2027/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Final week — protect the score: .*Jun 8/)).toBeVisible();
  // today's completion survived
  await expect(page.getByRole("button", { name: /^completed$/i })).toBeVisible();
});

test("plan renders on a phone-width viewport without horizontal scroll", async ({ page }) => {
  await page.goto("/plan");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});
