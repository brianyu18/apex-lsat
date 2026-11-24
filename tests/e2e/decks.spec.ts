import { test, expect } from "@playwright/test";

test("strategy deck: index, slide navigation, worked example reveal, practice", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/learn");
  await page.getByRole("link", { name: /strategy decks/i }).first().click();
  await expect(page.getByRole("heading", { name: "Strategy decks" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /reading comprehension/i })).toBeVisible();

  await page.getByRole("link", { name: /^Flaw/ }).click();
  await expect(page.getByTestId("deck-player")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Slide 1 of 10")).toBeVisible();

  // four worked examples, Level 1 to Level 4, in order
  const levels = page.getByRole("button", { name: /^Slide \d+: Level \d:/ });
  await expect(levels).toHaveCount(4);
  for (let k = 0; k < 4; k++) await expect(levels.nth(k)).toHaveAccessibleName(new RegExp(`Level ${k + 1}:`));

  // Level 1: try it first with a wrong pick, step through, and see the verdict
  await levels.first().click();
  await expect(page.getByTestId("worked-level")).toHaveText("Level 1 of 4");
  await expect(page.getByTestId("worked-stimulus")).toBeVisible();
  await expect(page.locator("mark")).toContainText("most voters");
  const choices = page.getByRole("list", { name: "Answer choices" });
  await choices.getByRole("button", { name: /^\(A\)/ }).click();
  await expect(page.getByTestId("try-first")).toContainText("Your pick: (A)");
  for (let k = 0; k < 3; k++) await page.getByRole("button", { name: /^next step$/i }).click();
  await page.getByRole("button", { name: /reveal the answer/i }).click();
  await expect(page.getByTestId("worked-result")).toContainText("Answer: (C)");
  await expect(page.getByTestId("worked-result")).toContainText("You picked (A)");

  // the next slide is the Level 2 example
  await page.getByRole("button", { name: /^next$/i }).click();
  await expect(page.getByTestId("worked-level")).toHaveText("Level 2 of 4");

  // traps flip open
  await page.getByRole("button", { name: /^Slide \d+: Flaw traps/ }).click();
  await page.getByRole("button", { name: /Didn’t happen/ }).click();
  await expect(page.getByText(/doesn’t commit/)).toBeVisible();

  // practice: answer one bank question and see feedback
  await page.keyboard.press("ArrowRight");
  const practice = page.getByTestId("practice");
  await expect(practice).toBeVisible({ timeout: 30_000 });
  await practice.getByRole("list", { name: "Answer choices" }).getByRole("button").first().click();
  await practice.getByRole("button", { name: /check answer/i }).click();
  await expect(practice.getByText(/^Right\.$|The answer is \([A-E]\)\./)).toBeVisible();

  // last slide links to a drill of this type
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("link", { name: /drill this type/i }).first()).toBeVisible();
});

test("RC deck shows a passage and lesson pages link to their deck", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/learn/decks/rc-comparative");
  const levels = page.getByRole("button", { name: /^Slide \d+: Level \d:/ });
  await expect(levels).toHaveCount(4);
  for (let k = 0; k < 4; k++) {
    await levels.nth(k).click();
    await expect(page.getByTestId("worked-passage")).toContainText("Passage B");
  }
  await page.goto("/learn/u2/flaw");
  await expect(page.getByRole("link", { name: /strategy deck: flaw/i })).toBeVisible({ timeout: 30_000 });
});
