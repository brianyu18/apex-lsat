import { test, expect } from "@playwright/test";

test("strategy deck: index, slide navigation, worked example reveal, practice", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/learn");
  await page.getByRole("link", { name: /strategy decks/i }).first().click();
  await expect(page.getByRole("heading", { name: "Strategy decks" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /reading comprehension/i })).toBeVisible();

  await page.getByRole("link", { name: /^Flaw/ }).click();
  await expect(page.getByTestId("deck-player")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Slide 1 of 7")).toBeVisible();

  // jump to the worked example and step through it
  await page.getByRole("button", { name: /Slide 4:/ }).click();
  await expect(page.getByTestId("worked-stimulus")).toBeVisible();
  await expect(page.locator("mark")).toContainText("most voters");
  for (let k = 0; k < 3; k++) await page.getByRole("button", { name: /^next step$/i }).click();
  await page.getByRole("button", { name: /reveal the answer/i }).click();
  await expect(page.getByText(/Answer: \(C\)/)).toBeVisible();

  // traps flip open
  await page.getByRole("button", { name: /^next$/i }).click();
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
  await page.getByRole("button", { name: /Slide 4:/ }).click();
  await expect(page.getByTestId("worked-passage")).toContainText("Passage B");
  await page.goto("/learn/u2/flaw");
  await expect(page.getByRole("link", { name: /strategy deck: flaw/i })).toBeVisible({ timeout: 30_000 });
});
