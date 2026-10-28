import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { ...devices["iPhone 14"], browserName: "chromium" } },
  ],
  webServer: {
    command: "APEX_E2E=1 APEX_DB_DIR=./data/e2e APEX_SCHOOLS_FILE=./tests/fixtures/schools-sample.json sh -c 'pnpm content:load && pnpm dev --port 3100'",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
