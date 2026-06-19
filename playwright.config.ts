import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright-config voor DriveCurator.
 *
 * Twee doelen:
 *  1. Screenshots voor de website (marketing) — zie e2e/*.spec.ts
 *  2. End-to-end / visuele regressietests
 *
 * De dev-server (vite) wordt automatisch gestart als die nog niet draait.
 */
export default defineConfig({
  testDir: './e2e',
  // Screenshots voor de website komen hier; los van test-artefacten (gitignored).
  snapshotDir: './e2e/__snapshots__',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // Retina-scherpte voor nette marketing-screenshots.
    deviceScaleFactor: 2,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
