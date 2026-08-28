import { test, expect } from '@playwright/test'
import { buildSchema } from '../../src/utils/build-schema'
import type { VJSFSchema } from '../../src/types'

const flatSchema: VJSFSchema = {
  type: 'object',
  properties: {
    nom: { type: 'string' },
    age: { type: 'number', title: 'Âge' }
  }
}

const groupedSchema: VJSFSchema = {
  type: 'object',
  properties: {
    a: { type: 'string', title: 'A', 'x-group': 'Identité' },
    b: { type: 'string', title: 'B', 'x-group': 'Coordonnées' },
    c: { type: 'string', title: 'C' }
  }
}

const attachmentSchema: VJSFSchema = {
  type: 'object',
  properties: {
    photo: { type: 'object', 'x-concept': { id: 'attachment' }, 'x-group': 'Média' },
    photoTitree: { type: 'object', title: 'Ma photo', 'x-concept': { id: 'attachment' } },
    nom: { type: 'string', title: 'Nom' }
  }
}

test('utilise la clé technique comme titre quand le champ n\'en a pas', () => {
  const { schema } = buildSchema(flatSchema)
  expect(schema.properties?.nom.title).toBe('nom')
  expect(schema.properties?.age.title).toBe('Âge')
})

test('laisse un schéma sans groupe x-group à plat', () => {
  const { schema } = buildSchema(flatSchema, { layout: 'sections' })
  expect(schema.layout).toBeUndefined()
  expect(schema.allOf).toBeUndefined()
  expect(Object.keys(schema.properties ?? {})).toEqual(['nom', 'age'])
})

test('regroupe les champs x-group et traduit la valeur historique sections en section', () => {
  const { schema } = buildSchema(groupedSchema, { layout: 'sections' })
  expect(schema.layout).toBe('section')
  expect(schema.allOf).toEqual([
    { title: 'Identité', properties: { a: { type: 'string', title: 'A', 'x-group': 'Identité' } } },
    { title: 'Coordonnées', properties: { b: { type: 'string', title: 'B', 'x-group': 'Coordonnées' } } }
  ])
  expect(schema.properties).toEqual({ c: { type: 'string', title: 'C' } })
})

test('en mode onglets, les champs hors groupe forment une section Autres champs', () => {
  const { schema } = buildSchema(groupedSchema, { layout: 'tabs' })
  expect(schema.layout).toBe('tabs')
  expect(schema.allOf?.map(s => s.title)).toEqual(['Identité', 'Coordonnées', 'Autres champs'])
  expect(schema.properties).toBeUndefined()
})

test('groups=none désactive le regroupement', () => {
  const { schema } = buildSchema(groupedSchema, { layout: 'tabs', groups: 'none' })
  expect(schema.allOf).toBeUndefined()
  expect(Object.keys(schema.properties ?? {})).toEqual(['a', 'b', 'c'])
})

test('layout=none conserve le schéma d\'origine', () => {
  const { schema } = buildSchema(groupedSchema, { layout: 'none' })
  expect(schema.allOf).toBeUndefined()
  expect(schema.layout).toBeUndefined()
  expect(Object.keys(schema.properties ?? {})).toEqual(['a', 'b', 'c'])
})

test('remplace le champ concept attachment par un champ __file en file-input', () => {
  const { schema, attachmentKey } = buildSchema(attachmentSchema, { attachmentsAsImage: true, layout: 'none' })
  expect(attachmentKey).toBe('photo')
  expect(schema.properties?.photo).toBeUndefined()
  expect(schema.properties?.__file).toMatchObject({
    type: 'object',
    layout: 'file-input',
    title: 'Image',
    'x-group': 'Média'
  })
})

test('titre du champ pièce jointe : valeur par défaut selon attachmentsAsImage', () => {
  const withoutImage = buildSchema(attachmentSchema, { layout: 'none' })
  expect(withoutImage.attachmentKey).toBe('photo')
  expect(withoutImage.schema.properties?.__file?.title).toBe('Document numérique attaché')
})

test('conserve le titre d\'origine du champ pièce jointe s\'il existe', () => {
  const titled: VJSFSchema = {
    type: 'object',
    properties: { doc: { type: 'object', title: 'Ma photo', 'x-concept': { id: 'attachment' } } }
  }
  const { schema } = buildSchema(titled, { attachmentsAsImage: true, layout: 'none' })
  expect(schema.properties?.__file?.title).toBe('Ma photo')
})

test('ne mute pas le schéma source', () => {
  const source: VJSFSchema = JSON.parse(JSON.stringify(groupedSchema))
  const before = JSON.parse(JSON.stringify(source))
  buildSchema(source, { layout: 'tabs', attachmentsAsImage: true })
  expect(source).toEqual(before)
})
