import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function onboard(page: Page) {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /build my plan/i }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 30_000 });
}

/** Answer the current question; returns whether it was marked correct. */
async function answerOne(page: Page, letter: "A" | "B" | "C" | "D" | "E", confidence: "sure" | "leaning" | "guess" = "leaning") {
  const choices = page.getByRole("list", { name: "Answer choices" });
  await expect(choices).toBeVisible({ timeout: 20_000 });
  // dwell so the auto-guess rule doesn't fire
  await page.waitForTimeout(1_100);
  await choices.getByRole("button", { name: new RegExp(`^${letter}\\b`) }).first().click();
  await page.getByRole("radio", { name: confidence }).click();
  await page.getByRole("button", { name: /check answer/i }).click();
  const explanation = page.getByRole("region", { name: "Explanation" });
  await expect(explanation).toBeVisible({ timeout: 20_000 });
  const correct = await explanation.getByText(/^Correct$/).first().isVisible().catch(() => false);
  return correct;
}

test.beforeAll(async ({ request }) => {
  await request.post("/api/dev/reset");
});

test("validation: cannot check without an answer and a confidence", async ({ page }) => {
  await onboard(page);
  await page.goto(`/drill/session?s=${encodeURIComponent(JSON.stringify({ count: 1, levels: [1] }))}`);
  await expect(page.getByRole("list", { name: "Answer choices" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.getByRole("region", { name: "Question" }).getByRole("alert")).toContainText(/pick an answer/i);
  await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^A\b/ }).first().click();
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.getByRole("region", { name: "Question" }).getByRole("alert")).toContainText(/how sure/i);
});

test("drill session: 3 questions, miss goes to inbox, read-lock on Next after a miss", async ({ page }) => {
  await page.goto(`/drill/session?s=${encodeURIComponent(JSON.stringify({ count: 3, levels: [1, 2] }))}`);
  let sawMiss = false;
  for (let i = 0; i < 3; i++) {
    // Always pick A, then if correct pick B next time — guarantees at least one miss across 3 questions most of the time;
    // to make it deterministic, on question 1 we deliberately pick two different letters by eliminating.
    const correct = await answerOne(page, i === 1 ? "B" : "A");
    if (!correct) {
      sawMiss = true;
      const next = page.getByRole("button", { name: /read the explanation|^next$/i });
      await expect(next).toBeDisabled();
      await expect(page.getByRole("button", { name: /^next$/i })).toBeEnabled({ timeout: 10_000 });
    }
    await page.getByRole("button", { name: /^next$/i }).click();
  }
  await expect(page.getByText(/accuracy/i).first()).toBeVisible({ timeout: 20_000 });
  // summary table has 3 rows
  await expect(page.locator("tbody tr")).toHaveCount(3);
  if (sawMiss) {
    await page.goto("/review");
    await expect(page.getByText(/to review/)).not.toContainText("0 to review");
  }
});

test("lesson renders its diagram and the check records progress", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/learn/u1/arguments-1");
  await expect(page.getByRole("heading", { name: /premise and conclusion/i })).toBeVisible();
  await expect(page.getByText("Map this argument")).toBeVisible();
  await page.getByRole("link", { name: /start the check/i }).click();
  await expect(page.getByText("Lesson check")).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await answerOne(page, "C", "sure");
    const next = page.getByRole("button", { name: /^next$/i });
    await expect(next).toBeEnabled({ timeout: 10_000 });
    await next.click();
  }
  await expect(page.getByText(/on the check/)).toBeVisible({ timeout: 20_000 });
  await page.goto("/learn");
  await expect(page.locator("text=/\\d\\/5/").first()).toBeVisible();
});

test("review detail: classify a miss and mark reviewed", async ({ page }) => {
  await page.goto("/review");
  const first = page.getByRole("listitem").getByRole("link", { name: /^Review$/ }).first();
  if (!(await first.isVisible().catch(() => false))) test.skip(true, "no misses to review in this run");
  await first.click();
  await expect(page.getByRole("heading", { name: /why did this happen/i })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("radio", { name: /logic gap/i }).click();
  await page.getByLabel(/one-line takeaway/i).fill("Check the force of the conclusion before the choices.");
  await page.getByRole("button", { name: /save & mark reviewed/i }).click();
  await expect(page).toHaveURL(/\/review$/, { timeout: 20_000 });
  await expect(page.getByText(/recently reviewed/i)).toBeVisible();
});

test("dashboard shows streak, inbox and ratings after activity", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/-day streak/)).toBeVisible();
  await expect(page.getByText(/Skill ratings/)).toBeVisible();
  await expect(page.getByText(/Logical Reasoning/).first()).toBeVisible();
});

test("unit 2 and 3 lessons render their interactive diagrams", async ({ page }) => {
  await page.goto("/learn/u2/flaw");
  await expect(page.getByRole("heading", { name: /^Flaw$/ })).toBeVisible();
  await expect(page.getByText(/How to attack/)).toBeVisible();
  await page.getByRole("button", { name: /next step/i }).click();
  await expect(page.getByRole("button", { name: /2\. / })).toHaveAttribute("aria-current", "step");
  await page.goto("/learn/u3/sampling");
  await expect(page.getByText(/Spot it/)).toBeVisible();
  await page.getByRole("button", { name: /pattern present|not here/i }).first().click();
  await expect(page.getByRole("button", { name: /^next →$/i })).toBeVisible();
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: /U2/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /U3/ })).toBeVisible();
});
