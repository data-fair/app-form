// tests/e2e/fixtures.ts — shared base of the e2e suite: console guard, session and site
// mocks, injection of window.APPLICATION. Specs import `test` and `expect` from here,
// never from '@playwright/test', so that the console guard applies to every test.
import { test as base, expect, type Page } from '@playwright/test'

export const test = base.extend<{ consoleGuard: void, expectedConsole: string[] }>({
  // messages (console or page errors) a test provokes on purpose (a failing request), named one by one:
  //   test.use({ expectedConsole: ['status of 500'] })
  // substrings, not RegExp: fixture options are serialized and a RegExp would not survive
  expectedConsole: [[], { option: true }],
  consoleGuard: [async ({ page, expectedConsole }, use) => {
    const messages: string[] = []
    page.on('console', (msg) => {
      if (msg.type() !== 'error' && msg.type() !== 'warning') return
      if (expectedConsole.some(text => msg.text().includes(text))) return
      messages.push(`[${msg.type()}] ${msg.text()}`)
    })
    page.on('pageerror', (err) => {
      if (expectedConsole.some(text => err.message.includes(text))) return
      // harness artifact: Vite serves index.html raw, the inline `window.APPLICATION=%APPLICATION%`
      // fails to parse and gotoApp has already defined window.APPLICATION
      if (err.message === "Unexpected token '%'") return
      messages.push(`[pageerror] ${err.message}`)
    })
    await use()
    expect(messages, 'console must stay clean').toEqual([])
  }, { auto: true }]
})
export { expect }

const SITE_INFO = {
  main: {},
  isAccountMain: true,
  authMode: 'open',
  theme: {
    colors: { primary: '#1976D2', secondary: '#424242', accent: '#82B1FF', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FB8C00' },
    dark: false,
    hc: false,
    hcDark: false,
    logo: null
  }
}

export function buildApplication (configuration: Record<string, unknown>) {
  return {
    id: 'test-form',
    slug: 'test-form',
    title: 'Formulaire de test',
    owner: { type: 'user', id: 'test' },
    href: 'http://localhost/api/v1/applications/test-form',
    apiUrl: 'http://localhost/api/v1',
    exposedUrl: 'http://localhost/data-fair/app/test-form',
    configuration
  }
}

export function makeJwt (payload: Record<string, unknown>): string {
  const b64url = (value: unknown) => btoa(JSON.stringify(value))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.signature`
}

async function mockSimpleDirectory (page: Page) {
  await page.route('**/simple-directory/api/sites/_public.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.__PUBLIC_SITE_INFO=${JSON.stringify(SITE_INFO)};`
  }))
  await page.route('**/simple-directory/api/sites/_public', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(SITE_INFO)
  }))
  await page.route('**/simple-directory/api/sites/_theme.css', route => route.fulfill({
    contentType: 'text/css',
    body: ''
  }))
}

export async function gotoApp (page: Page, application: unknown) {
  await mockSimpleDirectory(page)
  await page.addInitScript((app) => {
    Object.defineProperty(window, 'APPLICATION', {
      value: app,
      writable: false,
      configurable: true
    })
  }, application)
  await page.goto('/app/')
}
