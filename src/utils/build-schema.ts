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

  // On identifie le champ pièce jointe avant le repli de titres : sinon la
  // branche par défaut « Image / Document numérique attaché » est inatteignable.
  const attachmentEntry = Object.entries(schema.properties ?? {}).find(([, f]) => (f as VJSFProperty)['x-concept']?.id === 'attachment')

  Object.entries(schema.properties ?? {}).forEach(([key, value]) => {
    if (key === attachmentEntry?.[0]) return
    const v = value as VJSFProperty
    if (!v.title) v.title = key
  })

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
      // 'sections' n'existe pas dans le registre des composants de vjsf 4
      // (seul 'section' est valide) : on traduit la valeur de config historique.
      const layoutConfig = layout ?? 'sections'
      const layoutValue = layoutConfig === 'sections' ? 'section' : layoutConfig
      schema.layout = layoutValue
      const sections: Array<{ title: string; properties: Record<string, VJSFProperty> }> =
        Object.entries(groupsMap).map(([title, properties]) => ({ title, properties }))
      // En mode onglets/accordéon, un bloc de champs sans titre rendrait
      // un onglet vide : on le transforme en section titrée.
      if (Object.values(properties).length && ['tabs', 'vertical-tabs', 'expansion-panels'].includes(layoutValue)) {
        sections.push({ title: 'Autres champs', properties })
        delete schema.properties
      } else {
        schema.properties = properties
      }
      schema.allOf = sections
    } else if (Object.values(properties).length) {
      schema.properties = properties
    } else {
      delete schema.properties
    }
  }

  return { schema, attachmentKey }
}
