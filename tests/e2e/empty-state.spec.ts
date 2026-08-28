import { expect } from '@playwright/test'
import { test, gotoApp, buildApplication } from './fixtures'

test('affiche un état vide quand aucun jeu de données n\'est configuré', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`) })
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`))
  await gotoApp(page, buildApplication({}))
  await expect(page.locator('.v-empty-state')).toContainText('Configuration incomplète')
  // En vite nu, le placeholder %APPLICATION% d'index.html n'est pas substitué :
  // le script inline lève une SyntaxError attendue, l'APPLICATION injecté par
  // addInitScript reste en place (df-dev-server substitue le placeholder en dev réel).
  const expectedErrors = ["Unexpected token '%'"]
  expect(errors.filter(error => !expectedErrors.some(msg => error.includes(msg)))).toEqual([])
})
