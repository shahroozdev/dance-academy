import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

// Full acceptance-flow E2E suite (docs/08-testing-and-acceptance.md §8.2). Runs against a real
// Next.js server and a real Postgres database — there is no mock backend — so it's a single
// serial worker: the whole spec is one continuous scripted flow, not independent parallel cases.
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The notification modal's "Copy Message" button calls navigator.clipboard.writeText.
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
