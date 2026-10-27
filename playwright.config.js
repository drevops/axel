import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/functional',
  testMatch: '**/*.spec.js',
  outputDir: '.logs/playwright',
  reporter: 'list',
  forbidOnly: Boolean(process.env.CI),
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
