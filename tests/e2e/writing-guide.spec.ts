import { test, expect } from "@playwright/test";

test("writing guide: annotated essays, sentence upgrades, rubric, prompt library", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/learn");
  await page.getByRole("link", { name: /argumentative writing guide/i }).click();
  await expect(page.getByRole("heading", { name: "Argumentative Writing guide" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("50 minutes")).toBeVisible();
  await expect(page.getByTestId("blueprint").locator("li")).toHaveCount(6);

  // strong essay: paragraph 1 is selected and its thesis is highlighted; stepping changes the notes
  const strong = page.getByTestId("essay-four-day-strong");
  await expect(strong.locator("mark").first()).toContainText("Marlow County should move its high school");
  await strong.getByRole("button", { name: /^Paragraph 4:/ }).click();
  await expect(strong.getByText(/picks the perspective that most threatens its thesis/)).toBeVisible();
  await strong.getByRole("button", { name: /show all highlights/i }).click();
  expect(await strong.locator("mark").count()).toBeGreaterThan(10);

  // switch to the weak essay
  await page.getByRole("tab", { name: /weak essay/i }).click();
  const weak = page.getByTestId("essay-four-day-weak");
  await expect(weak.getByText(/A filler opening/)).toBeVisible();

  // sentence upgrades reveal the stronger version
  const cards = page.getByTestId("upgrade-cards").getByRole("button");
  await cards.first().click();
  await expect(page.getByText(/Tolland County should raise juror pay to \$120 a day, because/)).toBeVisible();

  // rubric: choose the top level everywhere → 12 of 12
  const rubric = page.getByTestId("self-rubric");
  const groups = rubric.locator("fieldset");
  await expect(groups).toHaveCount(6);
  for (let k = 0; k < 6; k++) await groups.nth(k).getByRole("button").nth(2).click();
  await expect(rubric.getByText("12 of 12")).toBeVisible();
  await groups.first().getByRole("button").first().click();
  await expect(rubric.getByText("10 of 12")).toBeVisible();
  await expect(rubric.getByText(/Fix first: Position/)).toBeVisible();

  // prompt library links into timed practice with the chosen prompt
  const lib = page.getByTestId("prompt-library");
  await expect(lib.locator("li")).toHaveCount(12);
  await lib.locator("li").filter({ hasText: "Juror pay" }).getByRole("link").click();
  await expect(page).toHaveURL(/\/test\/writing\?prompt=w-juror-pay/, { timeout: 30_000 });
  await expect(page.getByText("Argumentative Writing · Juror pay")).toBeVisible();
  await expect(page.getByTestId("prompt-picker").getByRole("link")).toHaveCount(12);
});
