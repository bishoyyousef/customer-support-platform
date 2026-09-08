import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  retries: 1,
  workers: 2,
  reporter: [['html'], ['list']],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' }, // Chrome 120+
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }, // Firefox 115+
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' }, // Edge 120+
    },
  ],
});
