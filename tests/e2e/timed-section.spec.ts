import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  await request.post("/api/dev/reset");
});

test("timed section: flag, submit, blind review, results with gap", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /build my plan/i }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 30_000 });

  await page.goto("/test/section");
  await page.getByRole("button", { name: "24" }).click();
  await page.getByRole("button", { name: /start section/i }).click();
  await expect(page.getByTestId("section-shell")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("timer")).toHaveText(/3[45]:\d\d/);

  // Answer every question "A", flag the first three, leave the last one blank.
  for (let i = 0; i < 24; i++) {
    const choices = page.getByRole("list", { name: "Answer choices" });
    await expect(choices).toBeVisible();
    if (i < 23) await choices.getByRole("button", { name: /^A\b/ }).first().click();
    if (i < 3) await page.getByRole("button", { name: /flag for review/i }).click();
    if (i < 23) await page.getByRole("button", { name: /^next/i }).click();
  }
  // Timer hide toggle works outside the last five minutes
  await page.getByRole("button", { name: /hide timer/i }).click();
  await expect(page.getByTestId("timer")).toHaveText("––:––");

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /submit section/i }).click();

  // Blind review: 3 flagged + 1 blank = 4
  await expect(page.getByRole("heading", { name: /blind review · 4 to reconsider/i })).toBeVisible({ timeout: 30_000 });
  for (let i = 0; i < 4; i++) {
    await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^B\b/ }).first().click();
    if (i < 3) await page.getByRole("button", { name: /^next/i }).click();
  }
  await page.getByRole("button", { name: /finish blind review/i }).click();

  // Results
  await expect(page.getByText(/^BR gap$/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^Blind spots$/)).toBeVisible();
  await expect(page.getByText(/recovered in BR/)).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(24);
  await expect(page.getByRole("img", { name: /pacing chart/i })).toBeVisible();

  // The section shows up on the Test hub and misses are in the inbox
  await page.goto("/test");
  await expect(page.getByText(/timed \d+\/24/)).toBeVisible();
  await page.goto("/review");
  await expect(page.getByText(/\d+ to review/)).toBeVisible();
});
