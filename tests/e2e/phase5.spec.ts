import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  await request.post("/api/dev/reset");
});

test("official PT track: list tests, schedule on PT days, import marks taken, plan shows today's test", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /build my plan/i }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 30_000 });

  await page.goto("/test/official");
  await expect(page.getByRole("heading", { name: /official preptest track/i })).toBeVisible({ timeout: 60_000 });
  await page.getByLabel(/preptest numbers/i).fill("150-153, 158");
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText(/5 available/)).toBeVisible({ timeout: 30_000 });
  const table = page.getByTestId("official-track");
  await expect(table.getByText("scheduled").first()).toBeVisible();
  // newest test lands on the last scheduled PT day
  const scheduledRows = table.locator("tr", { hasText: "scheduled" });
  await expect(scheduledRows.last()).toContainText("PrepTest 158");
  await expect(scheduledRows.first()).toContainText("PrepTest 150");

  // import PT 150 via the example and see it counted
  await scheduledRows.first().getByRole("link", { name: /import results/i }).click();
  await expect(page).toHaveURL(/\/test\/import\?pt=150/, { timeout: 30_000 });
  await expect(page.getByLabel(/preptest #/i)).toHaveValue("150");
  await page.getByRole("button", { name: /paste an example/i }).click();
  await page.getByRole("button", { name: /^preview$/i }).click();
  await expect(page.getByRole("heading", { name: /PT 150/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^import$/i }).click();
  await expect(page.getByRole("heading", { name: /^imported$/i })).toBeVisible({ timeout: 30_000 });
  await page.goto("/test/official");
  await expect(page.getByText(/1 taken/)).toBeVisible();
  await expect(page.getByTestId("official-track").getByText(/taken/).first()).toBeVisible();

  // official miss review: gist saved and shown
  await page.goto("/review");
  await page.locator("li", { hasText: /Official · PT 150/ }).first().getByRole("link", { name: /review|open/i }).click();
  await expect(page.getByTestId("official-ref")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel(/your gist/i).fill("Causal flaw; (B) names the reversal.");
  await page.getByRole("button", { name: /save gist/i }).click();
  await expect(page.getByLabel(/your gist/i)).toHaveValue(/Causal flaw/, { timeout: 30_000 });
});

test("schools: standing, odds bands, GPA, targets feed registration goal", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/schools");
  await expect(page.getByRole("heading", { name: /where you stand/i })).toBeVisible({ timeout: 60_000 });
  const table = page.getByTestId("schools-table");
  await expect(table.locator("tbody tr")).toHaveCount(3);
  // elite school is a long shot at the goal/current score; regional is likely
  await expect(table.locator("tr", { hasText: "Sample Regional College" })).toContainText(/Likely/);
  await page.getByLabel(/undergraduate gpa/i).fill("3.80");
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText(/GPA 3.80/)).toBeVisible({ timeout: 30_000 });
  // target the elite school → plan's registration goal becomes its median (173)
  await table.locator("tr", { hasText: "Sample Elite University" }).getByRole("button", { name: /^target$/i }).click();
  await expect(page.getByText(/most selective target median/i)).toContainText("173", { timeout: 30_000 });
  await page.goto("/schools?f=targets");
  await expect(page.getByTestId("schools-table").locator("tbody tr")).toHaveCount(1);
  // goal 175 already clears the 173 median, so the plan keeps the stated goal
  await expect(page.getByText(/already clears it/)).toBeVisible();
  await page.goto("/plan");
  await expect(page.getByText(/goal 175\. Rule/)).toBeVisible({ timeout: 30_000 });
});
