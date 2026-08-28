import { expect, type Page } from '@playwright/test'
import { test, gotoApp, buildApplication, makeJwt } from './fixtures'

const formSchema = {
  type: 'object',
  required: ['nom'],
  properties: {
    nom: { type: 'string', title: 'Nom' },
    age: { type: 'number', title: 'Âge' }
  }
}

function formApplication (exposedUrl = 'http://localhost/data-fair/app/test-form') {
  const application = buildApplication({
    datasets: [{
      id: 'ds1',
      href: '/api/v1/datasets/ds1',
      title: 'Jeu de données de test',
      schema: [],
      userPermissions: ['createLine'],
      attachmentsAsImage: false
    }],
    density: 'default',
    layout: 'sections',
    groups: 'all',
    variant: 'outlined',
    submitMessage: 'Merci pour votre participation !'
  })
  application.exposedUrl = exposedUrl
  return application
}

async function mockDatasetRoutes (page: Page) {
  await page.route('**/safe-schema**', route => route.fulfill({
    contentType: 'application/schema+json',
    body: JSON.stringify(formSchema)
  }))
  await page.route('**/lines', route => route.fulfill({ status: 201 }))
}

test('saisit et soumet le formulaire vers POST /lines', async ({ page }) => {
  test.slow()
  await mockDatasetRoutes(page)
  const linesRequests: { headers: Record<string, string>; body: string }[] = []
  page.on('request', request => {
    if (request.url().includes('/lines')) {
      linesRequests.push({ headers: request.headers(), body: request.postData() ?? '' })
    }
  })
  await gotoApp(page, formApplication())

  const button = page.getByRole('button', { name: 'Envoyer' })
  const nom = page.getByLabel('Nom')
  // Premier test à toucher le serveur vite : l'optimisation à froid des
  // dépendances (vjsf) peut dépasser le timeout par défaut des assertions.
  await expect(nom).toBeVisible({ timeout: 30_000 })
  await expect(button).toBeDisabled()
  await nom.fill('Alice Martin')
  await button.click()

  await expect(page.getByText('Merci pour votre participation !')).toBeVisible()
  expect(linesRequests).toHaveLength(1)
  const [request] = linesRequests
  expect(request.headers['content-disposition']).toBe('form-data')
  expect(request.headers['x-anonymoustoken']).toBeUndefined()
  expect(request.body).toContain('"nom":"Alice Martin"')
  expect(request.body).toContain('"age":null')
})

test('récupère un jeton anonyme quand l\'app est ouverte par lien partagé', async ({ page }) => {
  await mockDatasetRoutes(page)
  const token = makeJwt({ nbf: Math.floor(Date.now() / 1000) - 60 })
  await page.route('**/simple-directory/api/auth/anonymous-action', route => route.fulfill({
    contentType: 'text/plain',
    body: token
  }))
  const linesRequests: { headers: Record<string, string> }[] = []
  page.on('request', request => {
    if (request.url().includes('/lines')) linesRequests.push({ headers: request.headers() })
  })
  await gotoApp(page, formApplication('http://localhost/data-fair/app/test-form/57abc%3Akey'))

  const button = page.getByRole('button', { name: 'Envoyer' })
  await page.getByLabel('Nom').fill('Alice Martin')
  await expect(button).toBeEnabled()
  await button.click()

  await expect(page.getByText('Merci pour votre participation !')).toBeVisible()
  expect(linesRequests).toHaveLength(1)
  expect(linesRequests[0].headers['x-anonymoustoken']).toBe(token)
})
