import { test, expect, gotoApp, buildApplication } from './fixtures'

test('displays an empty state when no dataset is configured', async ({ page }) => {
  await gotoApp(page, buildApplication({}))
  await expect(page.locator('.v-empty-state')).toContainText('Configuration incomplète')
})
