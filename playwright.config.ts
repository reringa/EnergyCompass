import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for EnergyCompass E2E tests.
 *
 * Runs only against Chromium to keep the suite lean.
 * Tests are in the e2e/ directory at the project root.
 *
 * The frontend dev server (Next.js on port 3000) must be running before
 * executing E2E tests.  Start it with:
 *   cd frontend && npm run dev
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  /* Maximum time a single test may run */
  timeout: 60_000,

  /* Shared settings for all projects */
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    locale: 'nl-NL',
  },

  /* Only Chromium — no Firefox or WebKit to keep the suite lean */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Reporter: list in CI, html for local inspection */
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

  /* Retry failing tests once in CI */
  retries: process.env.CI ? 1 : 0,

  /* Do not start a dev server automatically — the developer is expected to
   * run it separately.  Uncomment the block below to enable auto-start. */
  // webServer: {
  //   command: 'cd frontend && npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  // },
});
