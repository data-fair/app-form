<script setup lang="ts">
import { watch, defineAsyncComponent } from 'vue'
import { useConfig } from '@/composables/config'
import { useConfigSync } from '@/composables/config-sync'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

window.iFrameResizer = { heightCalculationMethod: 'taggedElement' }

const { config, dataset } = useConfig()
useConfigSync()

watch(() => config.value, (newConfig) => {
  if (reactiveSearchParams.draft === 'true' && window.parent && newConfig) {
    const datasets = newConfig.datasets ? [newConfig.datasets[0]] : []
    const current = newConfig.datasets
    if (!current || current.length !== datasets.length || current[0]?.href !== datasets[0]?.href) {
      window.parent.postMessage({
        type: 'set-config',
        content: { field: 'datasets', value: datasets }
      }, '*')
    }
  }
}, { immediate: true, deep: true })

const DfForm = defineAsyncComponent(() => import('@/components/form.vue'))
</script>

<template>
  <v-app>
    <v-main>
      <v-container data-iframe-height>
        <suspense>
          <df-form v-if="dataset" :key="dataset.href" />
          <template #fallback>
            <v-row
              style="height:200px"
              class="ma-0 align-center"
            >
              <v-col class="text-center">
                <v-progress-circular
                  :size="60"
                  :width="5"
                  color="primary"
                  indeterminate
                />
              </v-col>
            </v-row>
          </template>
        </suspense>
      </v-container>
    </v-main>
    <df-ui-notif />
  </v-app>
</template>
