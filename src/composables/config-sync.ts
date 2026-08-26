import { onMounted, onUnmounted, toRaw } from 'vue'
import { useConfig } from './config'
import { setByPath } from '@/utils/set-by-path'
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
      // Fusionner plutôt qu'écraser : certains émetteurs n'envoient
      // qu'un sous-arbre modifié (perte des champs frères sinon).
      config.value = { ...toRaw(config.value), ...content } as AppConfig
    } else if (content.field && 'value' in content) {
      const next = JSON.parse(JSON.stringify(config.value)) as Record<string, unknown>
      setByPath(next, content.field, content.value)
      config.value = next as AppConfig
    }
  }

  onMounted(() => window.addEventListener('message', onMessage))
  onUnmounted(() => window.removeEventListener('message', onMessage))
}
