import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Meme Search E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './playwright/tests',

  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for DB consistency

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,

  /* Opt out of parallel tests on CI - ensures database consistency */
  workers: 1,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? 'github' : 'list',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 1400 }, // Standard test viewport
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'cd meme_search_pro/meme_search_app && mise exec -- bin/rails tailwindcss:build && mise exec -- bin/rails server -e test',
    url: 'http://localhost:3000',
    reuseExistingServer: false, // Always restart to clear caches between test runs
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120 * 1000,
  },
});
