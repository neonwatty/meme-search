import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load Docker E2E environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.docker-e2e') });

const BASE_URL = process.env.DOCKER_BASE_URL || 'http://localhost:3001';

/**
 * Playwright configuration for Docker E2E tests
 *
 * Key differences from CI config:
 * - No webServer (Docker Compose manages services)
 * - Longer timeouts (Docker startup overhead)
 * - More retries (network variability)
 * - Trace on all tests (better debugging)
 */
export default defineConfig({
  testDir: '../tests',

  // Output
  outputDir: '../test-results',

  // Timeouts
  timeout: 120 * 1000, // 120s per test (vs 30s in CI)
  expect: {
    timeout: 30 * 1000, // 30s for assertions (vs 5s in CI)
  },

  // Execution
  fullyParallel: false, // Sequential for shared database
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // More retries for Docker
  workers: 1, // Single worker for database consistency

  // Reporting
  reporter: [
    ['html', { outputFolder: '../playwright-report-docker', open: 'never' }],
    ['list'],
    ['json', { outputFile: '../test-results/docker-results.json' }],
  ],

  // Global setup/teardown
  globalSetup: undefined, // Services managed by Docker Compose
  globalTeardown: undefined,

  use: {
    // Base URL
    baseURL: BASE_URL,

    // Tracing
    trace: 'on', // Always trace in Docker (vs 'on-first-retry' in CI)
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Navigation
    navigationTimeout: 30 * 1000, // 30s (vs 10s in CI)
    actionTimeout: 10 * 1000, // 10s (vs 5s in CI)

    // Locale
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 1400 },
      },
    },
  ],

  // No webServer - Docker Compose manages services
});
