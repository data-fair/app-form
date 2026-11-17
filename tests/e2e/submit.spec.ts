import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
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

test('fills in and submits the form to POST /lines', async ({ page }) => {
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
  // First test to hit the vite server: the cold optimization of the
  // dependencies (vjsf) can exceed the default assertion timeout.
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

test('gets an anonymous token when the app is opened through a shared link', async ({ page }) => {
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

test('does not flag a pristine form with validation errors', async ({ page }) => {
  await mockDatasetRoutes(page)
  await gotoApp(page, formApplication())
  await expect(page.getByLabel('Nom')).toBeVisible({ timeout: 30_000 })
  // initialValidation keeps its vjsf default ('withData'): empty required fields are not in error
  await expect(page.locator('.v-field--error')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
})

const labelsFormSchema = {
  type: 'object',
  properties: {
    participation: { type: 'string', title: 'Présence', 'x-labels': { oui: 'Oui', non: 'Non' }, 'x-labelsRestricted': true }
  }
}

test('renders a restricted x-labels list as a select and submits the value, not the label', async ({ page }) => {
  await page.route('**/safe-schema**', route => route.fulfill({
    contentType: 'application/schema+json',
    body: JSON.stringify(labelsFormSchema)
  }))
  await page.route('**/lines', route => route.fulfill({ status: 201 }))
  let linesBody = ''
  page.on('request', request => {
    if (request.url().includes('/lines')) linesBody = request.postData() ?? ''
  })
  await gotoApp(page, formApplication())

  const select = page.getByRole('combobox', { name: 'Présence' })
  await expect(select).toBeVisible({ timeout: 30_000 })
  // the inner input is behind the Vuetify field wrapper: opening the list from the keyboard
  // keeps the test independent from the wrapper markup
  await select.press('ArrowDown')
  await page.getByRole('option', { name: 'Oui' }).click()
  await page.getByRole('button', { name: 'Envoyer' }).click()

  await expect(page.getByText('Merci pour votre participation !')).toBeVisible()
  expect(linesBody).toContain('"participation":"oui"')
})
