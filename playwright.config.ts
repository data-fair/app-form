import { defineConfig, devices } from '@playwright/test'

const projectValues = process.argv.flatMap((arg, i) => {
  if (arg === '--project') return [process.argv[i + 1] ?? '']
  const match = arg.match(/^--project=(.+)$/)
  return match ? [match[1]] : []
})
const isUnitOnly = projectValues.length > 0 && projectValues.every(value => value === 'unit')

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
