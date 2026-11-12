import { test, expect } from '@playwright/test'
import { setByPath } from '../../src/utils/set-by-path'

test('setByPath writes a value at a simple path', () => {
  const obj: Record<string, unknown> = {}
  setByPath(obj, 'submitMessage', 'Merci')
  expect(obj.submitMessage).toBe('Merci')
})

test('setByPath creates the intermediate objects of a nested path', () => {
  const obj: Record<string, unknown> = {}
  setByPath(obj, 'datasets.0.href', 'http://example.test/x')
  expect(obj).toEqual({ datasets: { 0: { href: 'http://example.test/x' } } })
})

test('setByPath clones the existing objects without mutating them', () => {
  const obj: Record<string, unknown> = { a: { b: 1 } }
  const before = obj.a as Record<string, unknown>
  setByPath(obj, 'a.c', 2)
  expect(obj.a).toEqual({ b: 1, c: 2 })
  expect(before).toEqual({ b: 1 }) // the original object is not modified
})

test('setByPath clones an existing array without mutating it', () => {
  const arr = [{ id: 'x' }]
  const obj: Record<string, unknown> = { datasets: arr }
  setByPath(obj, 'datasets.0.title', 'T')
  expect((obj.datasets as Array<Record<string, unknown>>)[0]).toEqual({ id: 'x', title: 'T' })
  expect(arr[0]).toEqual({ id: 'x' }) // the original item is not modified
})
