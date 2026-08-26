<script setup lang="ts">
import { watch, defineAsyncComponent } from 'vue'
import DfUiNotif from '@data-fair/lib-vuetify/ui-notif.vue'
import { mdiDatabaseOff } from '@mdi/js'
import { useConfig } from '@/composables/config'
import { useConfigSync } from '@/composables/config-sync'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

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
        <v-empty-state
          v-if="!dataset"
          :icon="mdiDatabaseOff"
          title="Configuration incomplète"
          text="Veuillez sélectionner un jeu de données dans la configuration de l'application."
        />
        <suspense v-else>
          <df-form :key="dataset.href" />
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
    <DfUiNotif />
  </v-app>
</template>
