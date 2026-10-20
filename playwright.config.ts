import { defineConfig, devices } from '@playwright/test';

/** Uçtan uca: Chromium, Firefox, WebKit. WebKit sonucu Safari sayılmaz; gerçek Safari ayrıca doğrulanır. */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5190', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://localhost:5190', reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
