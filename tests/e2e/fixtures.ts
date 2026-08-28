import { test as base, type Page } from '@playwright/test'

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

export const test = base

export async function gotoApp (page: Page, application: unknown) {
  await mockSimpleDirectory(page)
  await page.addInitScript((app) => {
    Object.defineProperty(window, 'APPLICATION', {
      value: app,
      writable: false,
      configurable: true
    })
  }, application)
  await page.goto('/')
}
