import { defineConfig, devices } from '@playwright/test'

const isUnitOnly = process.argv.includes('--project') &&
  process.argv[process.argv.indexOf('--project') + 1] === 'unit'

const port = process.env.APP_FORM_E2E_PORT || 3000

export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  outputDir: './tests/output',
  projects: [
    { name: 'unit', testDir: './tests/unit' },
    { name: 'e2e', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: isUnitOnly
    ? undefined
    : {
        command: 'PUBLIC_URL= vite --port ' + port,
        port: Number(port),
        reuseExistingServer: !process.env.CI
      }
})
