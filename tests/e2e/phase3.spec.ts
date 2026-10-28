import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function onboard(page: Page) {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /build my plan/i }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 30_000 });
}

/** Answer N questions of a LawHub-style section with "A", then submit (accepting the blanks dialog). */
async function answerAndSubmitSection(page: Page, answer: number) {
  await expect(page.getByTestId("section-shell")).toBeVisible({ timeout: 60_000 });
  for (let i = 0; i < answer; i++) {
    const choices = page.getByRole("list", { name: "Answer choices" });
    await expect(choices).toBeVisible();
    await choices.getByRole("button", { name: /^A\b/ }).first().click();
    await page.getByRole("button", { name: /^next/i }).click();
  }
  // Submit lives on the last question: jump there via the navigator.
  const nav = page.getByRole("list", { name: "Question navigator" }).getByRole("button");
  await nav.last().click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /submit section/i }).click();
}

test.beforeAll(async ({ request }) => {
  await request.post("/api/dev/reset");
});

test("RC drill: read passage, unlock questions, answer one, see passage summary", async ({ page }) => {
  test.setTimeout(180_000);
  await onboard(page);
  await page.goto("/drill");
  await page.getByRole("button", { name: /reading comprehension/i }).click();
  await expect(page).toHaveURL(/\/drill\/rc/);
  // Questions are locked until the passage is read
  await expect(page.getByText(/questions follow\. they unlock/i)).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /show questions/i }).click();
  const choices = page.getByRole("list", { name: "Answer choices" });
  await expect(choices).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1_100);
  await choices.getByRole("button", { name: /^A\b/ }).first().click();
  await page.getByRole("radio", { name: "leaning" }).click();
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.getByRole("region", { name: "Explanation" })).toBeVisible({ timeout: 20_000 });
  // End the session early → done card lists the passage with a score
  await page.getByRole("button", { name: /end session/i }).click();
  await expect(page.getByRole("heading", { name: /session complete/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/\d+\/\d+ · \d+ min/)).toBeVisible();
});

test("RC timed section: passage pane, submit, blind review, results", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/test/section?kind=RC");
  await page.getByRole("button", { name: /start section/i }).click();
  await expect(page.getByTestId("section-shell")).toBeVisible({ timeout: 60_000 });
  // Passage text is shown beside the question
  await expect(page.getByTestId("passage-pane")).toBeVisible();
  await answerAndSubmitSection(page, 5);
  await expect(page.getByRole("heading", { name: /blind review/i })).toBeVisible({ timeout: 30_000 });
  // BR shows the passage too
  await expect(page.getByTestId("passage-pane")).toBeVisible();
  const n = Number((await page.getByRole("heading", { name: /blind review/i }).textContent())!.match(/(\d+) to reconsider/)![1]);
  for (let i = 0; i < n; i++) {
    await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^B\b/ }).first().click();
    if (i < n - 1) await page.getByRole("button", { name: /^next/i }).click();
  }
  await page.getByRole("button", { name: /finish blind review/i }).click();
  await expect(page.getByText(/^BR gap$/)).toBeVisible({ timeout: 30_000 });
  await page.goto("/test");
  await expect(page.getByText(/RC · \d+ Q/)).toBeVisible();
});

test("Full practice test: 4 sections with break, BR, final scaled score", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/test/pt");
  await page.getByRole("button", { name: /extra lr/i }).click();
  await page.getByRole("button", { name: /begin test/i }).click();
  for (let s = 1; s <= 4; s++) {
    // After the break, section 3 starts directly (no intro card), like the real test.
    if (s !== 3) await page.getByRole("button", { name: new RegExp(`start section ${s}`, "i") }).click();
    await answerAndSubmitSection(page, 3);
    if (s === 2) {
      await expect(page.getByTestId("break-timer")).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: /skip break/i }).click();
    }
  }
  // Blind review over everything flagged/blank, then finalize
  await expect(page.getByRole("heading", { name: /blind review/i })).toBeVisible({ timeout: 30_000 });
  const n = Number((await page.getByRole("heading", { name: /blind review/i }).textContent())!.match(/(\d+) to reconsider/)![1]);
  for (let i = 0; i < n; i++) {
    await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^C\b/ }).first().click();
    if (i < n - 1) await page.getByRole("button", { name: /^next/i }).click();
  }
  await page.getByRole("button", { name: /finish blind review/i }).click();
  await expect(page.getByText(/^Timed score$/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/experimental/i).first()).toBeVisible();
  await page.goto("/test");
  await expect(page.getByText(/Full test/)).toBeVisible();
});

test("LawHub import: preview then import counts toward the range", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/test/import");
  await page.getByRole("button", { name: /paste an example/i }).click();
  await page.getByLabel(/preptest #/i).fill("158");
  await page.getByRole("button", { name: /^preview$/i }).click();
  await expect(page.getByRole("heading", { name: /PT 158/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^import$/i }).click();
  await expect(page.getByRole("heading", { name: /^imported$/i })).toBeVisible({ timeout: 30_000 });
  await page.goto("/test");
  await expect(page.getByText(/Full test/).first()).toBeVisible();
  await page.goto("/review");
  await expect(page.getByText(/\d+ to review/)).toBeVisible();
});

test("Skip trainer: triage gate, return pass, decision score", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/test/skip-trainer");
  await page.getByRole("button", { name: /^start$/i }).click();
  await expect(page.getByTestId("skip-shell")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("gate-timer")).toBeVisible();
  // Q1: skip. Q2–25: attempt and answer A.
  await page.getByRole("button", { name: /skip, come back/i }).click();
  for (let i = 1; i < 25; i++) {
    await page.getByRole("button", { name: /attempt now/i }).click();
    await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^B\b/ }).first().click();
  }
  // Return pass shows the skipped question
  await expect(page.getByText(/return pass/i)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^B\b/ }).first().click();
  await expect(page.getByText(/^Decision score$/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^Skips$/)).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(25);
  await expect(page.getByText("skipped", { exact: true })).toHaveCount(1);
  // Timing heatmap lists the sections run so far
  await page.goto("/test/timing");
  await expect(page.getByRole("heading", { name: /timing heatmap/i })).toBeVisible();
  await expect(page.getByText(/Skip · \d+\/25/)).toBeVisible();
});
