import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function onboard(page: Page) {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /build my plan/i }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 30_000 });
}

test.beforeAll(async ({ request }) => {
  await request.post("/api/dev/reset");
});

test("analytics with no data renders empty states, then seeded data fills every panel", async ({ page, request }) => {
  test.setTimeout(180_000);
  await onboard(page);
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: /where the next point is/i })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/after your first full test/i)).toBeVisible();

  const r = await request.post("/api/dev/seed", { data: { weeks: 6 } });
  expect(r.ok()).toBeTruthy();
  await page.goto("/analytics");
  await expect(page.getByTestId("range-card")).toContainText(/\d{3}–\d{3}/, { timeout: 60_000 });
  await expect(page.getByRole("img", { name: /scaled score per test/i })).toBeVisible();
  await expect(page.getByTestId("priorities-card").locator("tbody tr").first()).toBeVisible();
  await expect(page.getByTestId("calibration-card")).toContainText(/Sure/);
  await expect(page.getByTestId("quality-card")).toContainText(/Study quality/i);
  // dashboard shows the quality card too
  await page.goto("/");
  await expect(page.getByTestId("quality-card")).toBeVisible();
});

test("plan page shows exit criteria and registration advice", async ({ page }) => {
  await page.goto("/plan");
  await expect(page.getByTestId("readiness")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/phase exit criteria/i)).toBeVisible();
  await expect(page.getByText(/^Registration$/)).toBeVisible();
  await expect(page.getByText(/Range \d{3}–\d{3} over \d full-length/)).toBeVisible();
});

test("Unit 5 lesson renders the pacing simulator; Unit 6 lesson renders the outline builder", async ({ page }) => {
  await page.goto("/learn/u5/pacing-checkpoints");
  await expect(page.getByTestId("pacing-simulator")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /one bleed/i }).click();
  await expect(page.getByText(/clock runs out after/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /start the check/i })).toHaveAttribute("href", /\/test\/section\?lesson=u5/);
  await page.goto("/learn/u6/the-task");
  await expect(page.getByTestId("outline-builder")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /^Perspective A$/ }).first().click();
  await expect(page.getByText(/outline check · 1\/7/i)).toBeVisible();
});

test("writing practice: prewrite, write, save; lesson completes", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/test/writing?lesson=u6/the-task");
  await page.getByRole("button", { name: /start prewriting/i }).click();
  await expect(page.getByTestId("writing-prewrite")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^Perspective A$/ }).first().click();
  await page.getByLabel("Thesis").fill("The town should build the network because access is infrastructure and open access keeps competition alive.");
  await page.getByRole("button", { name: /start writing/i }).click();
  await expect(page.getByTestId("writing-essay")).toBeVisible();
  const essay = Array.from({ length: 40 }, (_, i) => `Sentence ${i + 1} of a practice essay arguing the position with a reason and an example.`).join(" ");
  await page.getByLabel("Essay").fill(essay);
  await page.getByRole("button", { name: /submit essay/i }).click();
  await expect(page.getByTestId("writing-done")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/lesson marked complete/i)).toBeVisible();
  await page.goto("/learn/u6/the-task");
  await expect(page.getByText(/Complete · 1\/1/)).toBeVisible({ timeout: 30_000 });
});

test("offline drill: pack cached, answers queued offline, synced when back online", async ({ page }) => {
  test.setTimeout(180_000);
  // warm the pack
  await page.goto("/drill");
  await expect(page.getByRole("heading", { name: /drill/i }).first()).toBeVisible({ timeout: 60_000 });
  await page.waitForFunction(async () => {
    const r = await new Promise<number>((res) => {
      const o = indexedDB.open("apex-offline", 1);
      o.onsuccess = () => {
        try {
          const t = o.result.transaction("pack", "readonly").objectStore("pack").count();
          t.onsuccess = () => res(t.result);
          t.onerror = () => res(0);
        } catch {
          res(0);
        }
      };
      o.onerror = () => res(0);
    });
    return r > 0;
  }, undefined, { timeout: 60_000 });

  // No service worker in dev, so the page itself must load online; the session's API calls then fail offline.
  await page.route("**/api/drill/**", (route) => route.abort("internetdisconnected"));
  await page.goto(`/drill/session?s=${encodeURIComponent(JSON.stringify({ count: 2 }))}`);
  await expect(page.getByTestId("offline-badge")).toBeVisible({ timeout: 30_000 });
  for (let i = 0; i < 2; i++) {
    const choices = page.getByRole("list", { name: "Answer choices" });
    await expect(choices).toBeVisible();
    await page.waitForTimeout(1_100);
    await choices.getByRole("button", { name: /^A\b/ }).first().click();
    await page.getByRole("radio", { name: "leaning" }).click();
    await page.getByRole("button", { name: /check answer/i }).click();
    await expect(page.getByRole("region", { name: "Explanation" })).toBeVisible();
    await page.getByRole("button", { name: /^next$|^next step$/i }).click({ timeout: 15_000 }).catch(async () => {
      await page.waitForTimeout(3_500);
      await page.getByRole("button", { name: /^next/i }).click();
    });
  }
  await expect(page.getByText(/^Accuracy$/)).toBeVisible({ timeout: 15_000 });
  await page.unroute("**/api/drill/**");
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText(/synced 2 offline attempts/i, { timeout: 60_000 });
});
