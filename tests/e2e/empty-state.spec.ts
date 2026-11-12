import { expect } from '@playwright/test'
import { test, gotoApp, buildApplication } from './fixtures'

test('displays an empty state when no dataset is configured', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`) })
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`))
  await gotoApp(page, buildApplication({}))
  await expect(page.locator('.v-empty-state')).toContainText('Configuration incomplète')
  // With plain vite, the %APPLICATION% placeholder of index.html is not substituted:
  // the inline script throws an expected SyntaxError, the APPLICATION injected by
  // addInitScript stays in place (df-dev-server substitutes the placeholder in real dev).
  const expectedErrors = ["Unexpected token '%'"]
  expect(errors.filter(error => !expectedErrors.some(msg => error.includes(msg)))).toEqual([])
})
