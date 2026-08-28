import { test, expect } from '@playwright/test'
import { decodeJWT, tokenDelayMs } from '../../src/utils/jwt'

function b64url (obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function makeToken (payload: Record<string, unknown>): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.signature`
}

test('decodeJWT décode un jeton valide', () => {
  expect(decodeJWT(makeToken({ nbf: 1700000000, sub: 'anonymous' })))
    .toEqual({ nbf: 1700000000, sub: 'anonymous' })
})

test('decodeJWT gère le base64url sans padding', () => {
  const payload = { nbf: 1700000000, longValue: 'une valeur suffisamment longue pour produire du padding' }
  expect(decodeJWT(makeToken(payload))).toEqual(payload)
})

test('decodeJWT rejette un jeton invalide', () => {
  expect(decodeJWT('not-a-token')).toBeNull()
  expect(decodeJWT('a.b')).toBeNull()
  expect(decodeJWT('a.###.c')).toBeNull()
})

test('tokenDelayMs vaut 0 pour un nbf passé ou absent', () => {
  expect(tokenDelayMs(null)).toBe(0)
  expect(tokenDelayMs(0)).toBe(0)
  expect(tokenDelayMs(Math.floor(Date.now() / 1000) - 60)).toBe(0)
})

test('tokenDelayMs attend nbf + 500 ms pour un nbf futur', () => {
  const delay = tokenDelayMs(Math.floor((Date.now() + 5000) / 1000))
  expect(delay).toBeGreaterThanOrEqual(4500)
  expect(delay).toBeLessThanOrEqual(5600)
})
