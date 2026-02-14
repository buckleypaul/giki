import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * E2E configuration for Giki
 *
 * This config:
 * - Builds the giki binary before tests
 * - Starts giki server against test fixture repo
 * - Runs tests in multiple browsers
 * - Takes screenshots on failure
 */

const GIKI_PORT = 4243; // Different from dev port (4242) to avoid conflicts
const GIKI_URL = `http://localhost:${GIKI_PORT}`;

export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: GIKI_URL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Run the giki server before starting the tests
  webServer: {
    command: `../giki --port ${GIKI_PORT} fixtures/test-repo`,
    url: GIKI_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    cwd: __dirname,
  },
});
