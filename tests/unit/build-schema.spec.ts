import type { VJSFSchema } from '../../src/types'
import { test, expect } from '@playwright/test'
import { buildSchema } from '../../src/utils/build-schema'

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

const labelsSchema: VJSFSchema = {
  type: 'object',
  properties: {
    participation: { type: 'string', title: 'Présence', 'x-labels': { oui: 'Oui', non: 'Non' }, 'x-labelsRestricted': true },
    ouvert: { type: 'string', 'x-labels': { a: 'A', b: 'B' } },
    dejaEnumere: { type: 'string', 'x-labels': { a: 'A' }, 'x-labelsRestricted': true, enum: ['a'] },
    codeEntier: { type: 'integer', 'x-labels': { 1: 'Un', 2: 'Deux' }, 'x-labelsRestricted': true }
  }
}

test('builds a select from a restricted x-labels list, and only in that case', () => {
  const { schema } = buildSchema(labelsSchema)
  expect(schema.properties?.participation.oneOf).toEqual([{ const: 'oui', title: 'Oui' }, { const: 'non', title: 'Non' }])
  // open list: the values live in the lines, the app has no permission to read them
  expect(schema.properties?.ouvert.oneOf).toBeUndefined()
  // an existing enum is already rendered as a select
  expect(schema.properties?.dejaEnumere.oneOf).toBeUndefined()
  // a const string in an integer column would be refused by the line validation
  expect(schema.properties?.codeEntier.oneOf).toBeUndefined()
})

test('uses the technical key as title when the field has none', () => {
  const { schema } = buildSchema(flatSchema)
  expect(schema.properties?.nom.title).toBe('nom')
  expect(schema.properties?.age.title).toBe('Âge')
})

test('leaves a schema without x-group groups flat', () => {
  const { schema } = buildSchema(flatSchema, { layout: 'sections' })
  expect(schema.layout).toBeUndefined()
  expect(schema.allOf).toBeUndefined()
  expect(Object.keys(schema.properties ?? {})).toEqual(['nom', 'age'])
})

test('groups the x-group fields and translates the legacy value sections to section', () => {
  const { schema } = buildSchema(groupedSchema, { layout: 'sections' })
  expect(schema.layout).toBe('section')
  expect(schema.allOf).toEqual([
    { title: 'Identité', properties: { a: { type: 'string', title: 'A', 'x-group': 'Identité' } } },
    { title: 'Coordonnées', properties: { b: { type: 'string', title: 'B', 'x-group': 'Coordonnées' } } }
  ])
  expect(schema.properties).toEqual({ c: { type: 'string', title: 'C' } })
})

test('in tabs mode, the ungrouped fields form an Autres champs section', () => {
  const { schema } = buildSchema(groupedSchema, { layout: 'tabs' })
  expect(schema.layout).toBe('tabs')
  expect(schema.allOf?.map(s => s.title)).toEqual(['Identité', 'Coordonnées', 'Autres champs'])
  expect(schema.properties).toBeUndefined()
})

test('groups=none disables grouping', () => {
  const { schema } = buildSchema(groupedSchema, { layout: 'tabs', groups: 'none' })
  expect(schema.allOf).toBeUndefined()
  expect(Object.keys(schema.properties ?? {})).toEqual(['a', 'b', 'c'])
})

test('layout=none keeps the original schema', () => {
  const { schema } = buildSchema(groupedSchema, { layout: 'none' })
  expect(schema.allOf).toBeUndefined()
  expect(schema.layout).toBeUndefined()
  expect(Object.keys(schema.properties ?? {})).toEqual(['a', 'b', 'c'])
})

test('replaces the attachment concept field with a __file file-input field', () => {
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

test('attachment field title: default value depending on attachmentsAsImage', () => {
  const withoutImage = buildSchema(attachmentSchema, { layout: 'none' })
  expect(withoutImage.attachmentKey).toBe('photo')
  expect(withoutImage.schema.properties?.__file?.title).toBe('Document numérique attaché')
})

test('keeps the original title of the attachment field if there is one', () => {
  const titled: VJSFSchema = {
    type: 'object',
    properties: { doc: { type: 'object', title: 'Ma photo', 'x-concept': { id: 'attachment' } } }
  }
  const { schema } = buildSchema(titled, { attachmentsAsImage: true, layout: 'none' })
  expect(schema.properties?.__file?.title).toBe('Ma photo')
})

test('does not mutate the source schema', () => {
  const source: VJSFSchema = JSON.parse(JSON.stringify(groupedSchema))
  const before = JSON.parse(JSON.stringify(source))
  buildSchema(source, { layout: 'tabs', attachmentsAsImage: true })
  expect(source).toEqual(before)
})

// json-layout only attaches its « information obligatoire » message to a property declared in the
// same object as its `required` list: moved into a group section, it would get the raw Ajv message
const requiredGroupedSchema: VJSFSchema = {
  type: 'object',
  required: ['a', 'c'],
  properties: {
    a: { type: 'string', title: 'A', 'x-group': 'Identité' },
    b: { type: 'string', title: 'B', 'x-group': 'Coordonnées' },
    c: { type: 'string', title: 'C' }
  }
}

test('moves the required keys into the group section of their field', () => {
  const { schema } = buildSchema(requiredGroupedSchema, { layout: 'sections' })
  expect(schema.allOf?.map(s => [s.title, s.required])).toEqual([['Identité', ['a']], ['Coordonnées', undefined]])
  expect(schema.required).toEqual(['c'])
})

test('in tabs mode, the ungrouped required keys follow the Autres champs section', () => {
  const { schema } = buildSchema(requiredGroupedSchema, { layout: 'tabs' })
  expect(schema.allOf?.map(s => [s.title, s.required])).toEqual([['Identité', ['a']], ['Coordonnées', undefined], ['Autres champs', ['c']]])
  expect(schema.required).toBeUndefined()
})

test('keeps the required keys at the root when the fields are not grouped', () => {
  const { schema } = buildSchema(requiredGroupedSchema, { layout: 'sections', groups: 'none' })
  expect(schema.allOf).toBeUndefined()
  expect(schema.required).toEqual(['a', 'c'])
})

test('a required attachment field requires the __file input that replaces it', () => {
  const { schema, attachmentKey } = buildSchema({ ...attachmentSchema, required: ['photo', 'nom'] })
  expect(attachmentKey).toBe('photo')
  // the photo column belongs to the Média group, so does its __file input
  expect(schema.allOf?.map(s => [s.title, s.required])).toEqual([['Média', ['__file']]])
  expect(schema.required).toEqual(['nom'])
})
