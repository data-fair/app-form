import type { Field } from '@data-fair/lib-common-types/application/index.js'

export interface VJSFProperty {
  title?: string
  type?: string | string[]
  description?: string
  layout?: string
  readOnly?: boolean
  'x-extension'?: boolean
  'x-concept'?: { id?: string; title?: string; primary?: boolean }
  'x-group'?: string
  'x-display'?: string
  'x-refersTo'?: string | null
  'x-labels'?: Record<string, string>
  'x-labelsRestricted'?: boolean
  'x-fromUrl'?: string
  'x-required'?: boolean
  'x-capabilities'?: Record<string, boolean>
  maxLength?: number
  enum?: string[]
  format?: string
  properties?: Record<string, VJSFProperty>
  items?: VJSFProperty
  [key: string]: unknown
}

export interface VJSFSchema {
  title?: string
  type?: string | string[]
  properties?: Record<string, VJSFProperty>
  allOf?: Array<{ title?: string; properties?: Record<string, VJSFProperty> }>
  layout?: string
  required?: string[]
  [key: string]: unknown
}

export interface AppConfig {
  datasets?: Array<{
    title: string
    href: string
    id: string
    slug?: string
    schema?: Field[]
    userPermissions?: string[]
    applicationKeyPermissions?: { operations?: string[] }
    attachmentsAsImage?: boolean
    finalizedAt?: string
    [key: string]: unknown
  }>
  density?: 'default' | 'compact' | 'comfortable'
  layout?: 'sections' | 'tabs' | 'vertical-tabs' | 'expansion-panels' | 'none'
  variant?: 'outlined' | 'plain' | 'underlined' | 'filled' | 'solo' | 'solo-inverted' | 'solo-filled'
  groups?: string
  submitMessage?: string
  [key: string]: unknown
}
