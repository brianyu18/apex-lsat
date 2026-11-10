import { test, expect } from "@playwright/test";

test.beforeAll(async ({ request }) => {
  await request.post("/api/dev/reset");
});

test("bring your own test: upload the template, take it, get a score, see it in the inbox", async ({ page, request }) => {
  test.setTimeout(240_000);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /build my plan/i }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 30_000 });

  const tpl = await (await request.get("/api/custom/template")).text();
  await page.goto("/test/custom");
  await expect(page.getByRole("heading", { name: /your own tests/i })).toBeVisible({ timeout: 60_000 });
  // a broken file is rejected with a path
  await page.getByLabel("Test JSON").fill('{"format":"apex-test/1","title":"x","sections":[]}');
  await page.getByRole("button", { name: /check file/i }).click();
  await expect(page.getByRole("alert").filter({ hasText: /sections/ })).toBeVisible({ timeout: 30_000 });
  // the template passes
  await page.getByLabel("Test JSON").fill(tpl);
  await page.getByRole("button", { name: /check file/i }).click();
  await expect(page.getByTestId("custom-preview")).toContainText(/S1 LR · 2 Q/, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: /add test/i })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /add test/i }).click();
  const row = page.getByTestId("custom-tests").locator("tbody tr").first();
  await expect(row).toContainText(/Example test/, { timeout: 30_000 });
  await row.getByRole("link", { name: /^take$/i }).click();

  await page.getByRole("button", { name: /begin test/i }).click({ timeout: 60_000 });
  // Section 1 (LR, 2 questions): answer A (correct) then leave Q2 blank
  await page.getByRole("button", { name: /start section 1/i }).click();
  await expect(page.getByTestId("section-shell")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^A\b/ }).first().click();
  await page.getByRole("list", { name: "Question navigator" }).getByRole("button").last().click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /submit section/i }).click();
  // Section 2 (RC, 1 question): passage visible, answer C (correct)
  await page.getByRole("button", { name: /start section 2/i }).click();
  await expect(page.getByTestId("passage-pane")).toContainText(/Wexcombe/, { timeout: 30_000 });
  await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^C\b/ }).first().click();
  await page.getByRole("button", { name: /submit section/i }).click();
  // Blind review of the blank one: pick B (correct)
  await expect(page.getByRole("heading", { name: /blind review/i })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("list", { name: "Answer choices" }).getByRole("button", { name: /^B\b/ }).first().click();
  await page.getByRole("button", { name: /finish blind review/i }).click();
  await expect(page.getByText(/^Timed score$/)).toBeVisible({ timeout: 30_000 });

  await page.goto("/test/custom");
  await expect(page.getByTestId("custom-tests").locator("tbody tr").first()).toContainText(/1× · last \d{3}/);
  await page.goto("/review");
  await expect(page.getByText(/Councilor: Since the new bike lanes/)).toBeVisible({ timeout: 30_000 });
});
