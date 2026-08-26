import { test, expect } from '@playwright/test'
import { setByPath } from '../../src/utils/set-by-path'

test('setByPath écrit une valeur à un chemin simple', () => {
  const obj: Record<string, unknown> = {}
  setByPath(obj, 'submitMessage', 'Merci')
  expect(obj.submitMessage).toBe('Merci')
})

test('setByPath crée les objets intermédiaires d\'un chemin imbriqué', () => {
  const obj: Record<string, unknown> = {}
  setByPath(obj, 'datasets.0.href', 'http://example.test/x')
  expect(obj).toEqual({ datasets: { 0: { href: 'http://example.test/x' } } })
})

test('setByPath clone les objets existants sans les muter', () => {
  const obj: Record<string, unknown> = { a: { b: 1 } }
  const before = obj.a as Record<string, unknown>
  setByPath(obj, 'a.c', 2)
  expect(obj.a).toEqual({ b: 1, c: 2 })
  expect(before).toEqual({ b: 1 }) // l'objet original n'est pas modifié
})

test('setByPath clone un tableau existant sans le muter', () => {
  const arr = [{ id: 'x' }]
  const obj: Record<string, unknown> = { datasets: arr }
  setByPath(obj, 'datasets.0.title', 'T')
  expect((obj.datasets as Array<Record<string, unknown>>)[0]).toEqual({ id: 'x', title: 'T' })
  expect(arr[0]).toEqual({ id: 'x' }) // l'élément original n'est pas modifié
})
