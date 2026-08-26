import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { computed, inject, ref, type App, type Ref, type ComputedRef } from 'vue'
import type { Application } from '@data-fair/lib-common-types/application/index.js'
import createDFrameAdapter from '@data-fair/frame/lib/vue-reactive/state-change-adapter.js'
import type { AppConfig, DatasetConfig } from '@/types'

export interface ConfigState {
  application: Application & { href: string }
  config: Ref<AppConfig>
  dataset: Ref<DatasetConfig | undefined>
  directoryUrl: ComputedRef<string>
  dFrameAdapter: ReturnType<typeof createDFrameAdapter>
  accessKey: Ref<string | null>
}

export function createConfig () {
  const application = window.APPLICATION
  const config = ref<AppConfig>(application.configuration || {})

  const dataset = computed<DatasetConfig | undefined>(() => config.value.datasets?.[0])

  const last = window.APPLICATION?.exposedUrl?.split('/').pop()
  const toks = last?.split('%3A')
  const accessKey = ref<string | null>((toks?.length === 2) ? toks[0] : null)

  const directoryUrl = computed<string>(() => '/simple-directory')

  const dFrameAdapter = createDFrameAdapter(reactiveSearchParams)

  return {
    install (app: App) {
      app.provide('data-fair-app-config', {
        application,
        config,
        dataset,
        directoryUrl,
        dFrameAdapter,
        accessKey
      } as ConfigState)
    }
  }
}

export function useConfig (): ConfigState {
  const config = inject<ConfigState>('data-fair-app-config')
  if (!config) throw new Error('useConfig requires using the plugin createConfig')
  return config
}

export default useConfig
