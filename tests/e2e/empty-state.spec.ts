import { expect } from '@playwright/test'
import { test, gotoApp, buildApplication } from './fixtures'

test('affiche un état vide quand aucun jeu de données n\'est configuré', async ({ page }) => {
  const messages: string[] = []
  page.on('console', msg => messages.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => messages.push(`[pageerror] ${err.message}`))
  await gotoApp(page, buildApplication({}))
  const emptyState = page.locator('.v-empty-state')
  await expect(emptyState).toBeVisible()
  console.log('CONSOLE:\n' + messages.join('\n'))
  await expect(emptyState).toContainText('Configuration incomplète')
})
