import { defineConfig, devices } from "@playwright/test";

// Expects the API on :8000 with seed data (python -m scripts.seed --import --reset).
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: { command: "npm run build && npx next start -p 3000", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 240_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile-375", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true } },
  ],
});
