import { test, expect, type Page } from "@playwright/test";

test.beforeAll(async ({ request }) => {
  await request.post("/api/dev/reset");
});

async function answerAndSubmit(page: Page, answer: number) {
  await expect(page.getByTestId("section-shell")).toBeVisible({ timeout: 60_000 });
  for (let i = 0; i < answer; i++) {
    await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^A\b/ }).first().click();
    await page.getByRole("button", { name: /^next/i }).click();
  }
  await page.getByRole("list", { name: "Question navigator" }).getByRole("button").last().click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /submit section/i }).click();
}

test("August 2027 format: RC then two LR sections, two breaks, embedded unscored questions", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /build my plan/i }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 30_000 });
  await page.goto("/test/pt");
  await page.getByRole("button", { name: /august 2027 format/i }).click();
  await expect(page.getByText(/no separate unscored section/i)).toBeVisible();
  await page.getByRole("button", { name: /begin test/i }).click();

  // Section 1: Reading Comprehension, six passages, 52 minutes
  await expect(page.getByText(/section 1 of 3/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /reading comprehension/i })).toBeVisible();
  await expect(page.getByText(/\d+ questions · 52 minutes/)).toBeVisible();
  await page.getByRole("button", { name: /start section 1/i }).click();
  await expect(page.getByTestId("passage-pane")).toBeVisible({ timeout: 60_000 });
  await answerAndSubmit(page, 3);
  await expect(page.getByTestId("break-timer")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /skip break/i }).click();

  // Section 2: Logical Reasoning, 32 questions, then the second break
  await expect(page.getByRole("list", { name: "Question navigator" }).getByRole("button")).toHaveCount(32, { timeout: 60_000 });
  await answerAndSubmit(page, 3);
  await expect(page.getByTestId("break-timer")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /skip break/i }).click();

  // Section 3: Logical Reasoning, 32 questions
  await expect(page.getByRole("list", { name: "Question navigator" }).getByRole("button")).toHaveCount(32, { timeout: 60_000 });
  await answerAndSubmit(page, 3);

  // Blind review covers scored questions only, then results show the embedded unscored counts
  await expect(page.getByRole("heading", { name: /blind review/i })).toBeVisible({ timeout: 30_000 });
  const n = Number((await page.getByRole("heading", { name: /blind review/i }).textContent())!.match(/(\d+) to reconsider/)![1]);
  expect(n).toBeLessThanOrEqual(80);
  for (let i = 0; i < n; i++) {
    await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^C\b/ }).first().click();
    if (i < n - 1) await page.getByRole("button", { name: /^next/i }).click();
  }
  await page.getByRole("button", { name: /finish blind review/i }).click();
  await expect(page.getByText(/^Timed score$/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/\+ 7 unscored/)).toHaveCount(2);
  await expect(page.getByText(/\+ \d+ unscored/)).toHaveCount(3);
});
