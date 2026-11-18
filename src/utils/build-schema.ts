import type { AppConfig, DatasetConfig, VJSFProperty, VJSFSchema } from '@/types'

export interface BuildSchemaOptions {
  layout?: AppConfig['layout']
  groups?: AppConfig['groups']
  attachmentsAsImage?: DatasetConfig['attachmentsAsImage']
}

export interface BuiltSchema {
  schema: VJSFSchema
  attachmentKey: string | null
}

export function buildSchema (source: VJSFSchema, options: BuildSchemaOptions = {}): BuiltSchema {
  const schema: VJSFSchema = JSON.parse(JSON.stringify(source))
  const { layout = 'sections', groups = 'all', attachmentsAsImage } = options

  // The attachment field is identified before the title fallback: otherwise the
  // default « Image / Document numérique attaché » branch is unreachable.
  const attachmentEntry = Object.entries(schema.properties ?? {}).find(([, f]) => (f as VJSFProperty)['x-concept']?.id === 'attachment')

  Object.entries(schema.properties ?? {}).forEach(([key, value]) => {
    if (key === attachmentEntry?.[0]) return
    const v = value as VJSFProperty
    if (!v.title) v.title = key
  })

  // A closed list of allowed values is declared with x-labelsRestricted (x-labels maps each allowed
  // value to its label). The safe schema served by data-fair withholds the enums, but it keeps these
  // owner-declared labels: oneOf is the shape vjsf renders as a select.
  for (const prop of Object.values(schema.properties ?? {}) as VJSFProperty[]) {
    if (prop.type !== 'string' || !prop['x-labelsRestricted'] || !prop['x-labels'] || prop.enum || prop.oneOf) continue
    prop.oneOf = Object.entries(prop['x-labels']).map(([allowedValue, label]) => ({ const: allowedValue, title: label }))
  }

  let attachmentKey: string | null = null
  if (attachmentEntry) {
    attachmentKey = attachmentEntry[0]
    delete (schema.properties as Record<string, VJSFProperty>)[attachmentEntry[0]]
    schema.properties = schema.properties ?? {}
    schema.properties.__file = {
      title: (attachmentEntry[1] as VJSFProperty).title || (attachmentsAsImage ? 'Image' : 'Document numérique attaché'),
      type: 'object',
      layout: 'file-input'
    }
    const g = (attachmentEntry[1] as VJSFProperty)['x-group']
    if (g) schema.properties.__file['x-group'] = g
    // a required attachment column requires the input that replaces it,
    // otherwise the error targets a property no field renders
    if (schema.required?.includes(attachmentKey)) {
      schema.required = schema.required.map(key => key === attachmentKey ? '__file' : key)
    }
  }

  if (layout !== 'none') {
    const groupsMap: Record<string, Record<string, VJSFProperty>> = {}
    const properties: Record<string, VJSFProperty> = {}
    for (const [key, prop] of Object.entries(schema.properties ?? {}) as [string, VJSFProperty][]) {
      if (groups !== 'none' && prop['x-group']) {
        groupsMap[prop['x-group']] = groupsMap[prop['x-group']] || {}
        groupsMap[prop['x-group']][key] = prop
      } else {
        properties[key] = prop
      }
    }
    if (Object.values(groupsMap).length) {
      // 'sections' does not exist in the vjsf 4 component registry
      // (only 'section' is valid): the legacy config value is translated.
      const layoutConfig = layout ?? 'sections'
      const layoutValue = layoutConfig === 'sections' ? 'section' : layoutConfig
      schema.layout = layoutValue
      // json-layout only attaches its « information obligatoire » message to a property declared
      // in the same object as its `required` list: each section carries the keys of its own fields,
      // otherwise a grouped field gets the raw Ajv message (« requiert la propriété nom »)
      const required = new Set(schema.required ?? [])
      const section = (title: string, properties: Record<string, VJSFProperty>) => {
        const sectionRequired = Object.keys(properties).filter(key => required.has(key))
        sectionRequired.forEach(key => required.delete(key))
        return sectionRequired.length ? { title, properties, required: sectionRequired } : { title, properties }
      }
      const sections: Array<{ title: string; properties: Record<string, VJSFProperty>; required?: string[] }> =
        Object.entries(groupsMap).map(([title, properties]) => section(title, properties))
      // In tabs/accordion mode, a block of fields without a title would render
      // an empty tab: it is turned into a titled section.
      if (Object.values(properties).length && ['tabs', 'vertical-tabs', 'expansion-panels'].includes(layoutValue)) {
        sections.push(section('Autres champs', properties))
        delete schema.properties
      } else {
        schema.properties = properties
      }
      schema.allOf = sections
      if (required.size) schema.required = [...required]
      else delete schema.required
    } else if (Object.values(properties).length) {
      schema.properties = properties
    } else {
      delete schema.properties
    }
  }

  return { schema, attachmentKey }
}
