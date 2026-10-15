import { defineConfig, devices } from "@playwright/test";

// BASE_URL=https://psychology-of-learning-nptel.vercel.app npm run test:e2e  → test production
// otherwise a production build is served locally on :4174
const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const local = !process.env.BASE_URL;

const ui = { testMatch: /(ui|a11y)\.spec\.ts/ };

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 4,
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "test-results/report" }]],
  globalTeardown: "./tests/e2e/teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: local
    ? { command: "npm run build && npx vite preview --port 4174 --strictPort --host 127.0.0.1", url: BASE_URL, reuseExistingServer: true, timeout: 180_000 }
    : undefined,
  projects: [
    // live API / security checks, no browser UI needed
    { name: "api", testMatch: /(api-security|http)\.spec\.ts/ },

    // phones
    { name: "galaxy-s9-320", use: { ...devices["Galaxy S9+"] }, ...ui },
    { name: "pixel-7", use: { ...devices["Pixel 7"] }, testMatch: /(ui|a11y|auth)\.spec\.ts/ },
    { name: "iphone-se", use: { ...devices["iPhone SE"] }, ...ui },
    { name: "iphone-13", use: { ...devices["iPhone 13"] }, testMatch: /(ui|auth)\.spec\.ts/ },
    { name: "iphone-14-pro-max", use: { ...devices["iPhone 14 Pro Max"] }, ...ui },
    // tablets
    { name: "ipad-mini", use: { ...devices["iPad Mini"] }, ...ui },
    { name: "galaxy-tab-s4", use: { ...devices["Galaxy Tab S4"] }, ...ui },
    // laptops / desktops
    { name: "laptop-chrome-1366", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } }, testMatch: /(ui|a11y)\.spec\.ts/ },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } }, testMatch: /(ui|auth)\.spec\.ts/ },
    { name: "desktop-safari", use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 800 } }, ...ui },
    { name: "desktop-edge-1920", use: { ...devices["Desktop Edge"], viewport: { width: 1920, height: 1080 } }, ...ui },
  ],
});
