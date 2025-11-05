import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Define storage state paths
export const USER_1_STATE = path.join(__dirname, 'playwright/.auth/user1.json');
export const USER_2_STATE = path.join(__dirname, 'playwright/.auth/user2.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // Use the dedicated 'setup' project below to seed auth states.

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  // Configure projects for major browsers
  projects: [
    // --- Setup Project ---
    // This project runs first to authenticate our two test users.
    {
      name: 'setup',
      testMatch: 'global.setup.ts',
    },

    // --- Main Test Project (Chromium) ---
    // This project depends on 'setup' and uses the auth state of User 1.
    {
      name: 'chromium-user1',
      use: {
        ...devices['Desktop Chrome'],
        storageState: USER_1_STATE,
      },
      dependencies: ['setup'],
      testIgnore: 'transfer.spec.ts', // Transfer test is special
    },

    // --- Transfer Test Project ---
    // This project runs the P2P transfer test, which needs both users.
    // It's separated because it has a different setup (launches 2 browsers).
    {
      name: 'chromium-transfer',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
      testMatch: 'transfer.spec.ts',
    },

    /*
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: USER_1_STATE,
      },
      dependencies: ['setup'],
      testIgnore: 'transfer.spec.ts',
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: USER_1_STATE,
      },
      dependencies: ['setup'],
      testIgnore: 'transfer.spec.ts',
    },
    */
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm start', // Assumes you have run `pnpm build` first
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});