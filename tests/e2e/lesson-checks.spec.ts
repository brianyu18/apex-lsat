import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const content = (f: string) => JSON.parse(readFileSync(path.join(process.cwd(), "content/lessons", f), "utf8"));

test("Unit 0 lessons check with a quiz on the lesson, and keep the practice set optional", async ({ page }) => {
  test.setTimeout(120_000);
  const quiz = content("quizzes.json")["u0/how-this-program-works"] as { answer: string }[];
  await page.goto("/learn/u0/how-this-program-works");
  await expect(page.getByRole("heading", { name: /five questions on this lesson/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: /start the practice set/i })).toBeVisible();
  const box = page.getByTestId("lesson-quiz");
  for (let k = 0; k < quiz.length; k++) {
    // miss the first question on purpose: 4 of 5 still completes the lesson
    const letter = k === 0 ? (quiz[k].answer === "A" ? "B" : "A") : quiz[k].answer;
    await box.getByRole("button", { name: new RegExp(`^\\(${letter}\\)`) }).click();
    await expect(page.getByTestId("quiz-verdict")).toHaveText(k === 0 ? /The answer is/ : "Right.");
    await page.getByRole("button", { name: k < quiz.length - 1 ? "Next question" : "See my score" }).click();
  }
  await expect(page.getByTestId("lesson-quiz-result")).toContainText("4 of 5");
  await expect(page.getByTestId("lesson-quiz-result")).toContainText("Lesson complete.");
  await page.reload();
  await expect(page.getByText("Complete · 4/5")).toBeVisible({ timeout: 30_000 });
});

test("a Foundations check draws only from the questions picked for that lesson", async ({ page }) => {
  test.setTimeout(120_000);
  const pool = new Set<string>(content("check-pools.json").pools["u1/conditional-1"].ids);
  const served: string[] = [];
  page.on("response", async (r) => {
    if (!r.url().includes("/api/drill/next")) return;
    const body = (await r.json().catch(() => null)) as { question?: { id: string } | null } | null;
    if (body?.question) served.push(body.question.id);
  });
  await page.goto("/learn/u1/conditional-1");
  await expect(page.getByText(/bank questions picked to test this lesson/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: /start the check/i }).click();
  await expect(page.getByText("Lesson check")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => served.length, { timeout: 30_000 }).toBeGreaterThan(0);
  for (const id of served) expect(pool.has(id), id).toBe(true);
});
