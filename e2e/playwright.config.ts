import { defineConfig, devices } from "@playwright/test";

// The one mandatory E2E workflow the spec asks for: login → create ticket
// → agent login → assign → update status → resolve → customer closes.
// Playwright drives a REAL browser against the REAL running app (both
// servers below), so this is the closest thing to "does the whole system
// actually work" — as opposed to unit tests (one function) or integration
// tests (one API call at a time, no browser/UI involved at all).
//
// Ports 4001/5175 (not the usual 4000/5173) are deliberate — dedicated
// ports nothing else on the machine would already be using, so Playwright
// can never accidentally attach to an unrelated already-running server
// (which is exactly what happened during development here: another
// project's dev server was already on 5173).
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // the flow tests share ticket state across steps — parallel workers would race each other
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:5175",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: [
    {
      command: "node scripts/startBackendForE2E.cjs",
      url: "http://localhost:4001/api/health",
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 5175 --strictPort",
      cwd: "../frontend",
      url: "http://localhost:5175",
      timeout: 30_000,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: "http://localhost:4001/api/v1",
        VITE_SOCKET_URL: "http://localhost:4001",
      },
    },
  ],
});
