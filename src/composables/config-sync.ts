import { onMounted, onUnmounted } from 'vue'
import { useConfig } from './config'
import type { AppConfig } from '@/types'

interface SetConfigContent {
  configuration?: Record<string, unknown>
  datasets?: unknown
  field?: string
  value?: unknown
}

interface SetConfigMessage {
  type: string
  content?: SetConfigContent
}

function setByPath (obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const existing = current[key]
    if (existing === undefined || existing === null || typeof existing !== 'object') {
      current[key] = {}
    } else if (Array.isArray(existing)) {
      current[key] = [...existing]
    } else {
      current[key] = { ...(existing as Record<string, unknown>) }
    }
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
}

export function useConfigSync (): void {
  const { config } = useConfig()

  function onMessage (event: MessageEvent<SetConfigMessage>): void {
    if (event.source !== window.parent) return
    if (event.data?.type !== 'set-config') return
    const content = event.data.content
    if (!content) return

    if (content.configuration) {
      config.value = content.configuration as AppConfig
    } else if (content.datasets) {
      config.value = content as AppConfig
    } else if (content.field && 'value' in content) {
      const next = JSON.parse(JSON.stringify(config.value)) as Record<string, unknown>
      setByPath(next, content.field, content.value)
      config.value = next as AppConfig
    }
  }

  onMounted(() => window.addEventListener('message', onMessage))
  onUnmounted(() => window.removeEventListener('message', onMessage))
}
