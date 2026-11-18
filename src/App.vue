<script setup lang="ts">
import { watch, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import DfUiNotif from '@data-fair/lib-vuetify/ui-notif.vue'
import { mdiDatabaseOff } from '@mdi/js'
import { useConfig } from '@/composables/config'
import { useConfigSync } from '@/composables/config-sync'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

const { t } = useI18n()
const { config, dataset } = useConfig()
useConfigSync()

// embedded, the app lets its host paint the background
const embedded = window.self !== window.top

watch(() => config.value, (newConfig) => {
  if (reactiveSearchParams.draft === 'true' && window.parent && newConfig) {
    const datasets = newConfig.datasets ? [newConfig.datasets[0]] : []
    const current = newConfig.datasets
    if (!current || current.length !== datasets.length || current[0]?.href !== datasets[0]?.href) {
      // plain copy: postMessage cannot clone the reactive proxies of the config (DataCloneError)
      window.parent.postMessage(JSON.parse(JSON.stringify({
        type: 'set-config',
        content: { field: 'datasets', value: datasets }
      })), '*')
    }
  }
}, { immediate: true, deep: true })

const DfForm = defineAsyncComponent(() => import('@/components/form.vue'))
</script>

<template>
  <v-app :class="{ 'bg-transparent': embedded }">
    <v-main>
      <v-container
        class="pa-2"
        data-iframe-height
      >
        <v-empty-state
          v-if="!dataset"
          :icon="mdiDatabaseOff"
          :title="t('incompleteTitle')"
          :text="t('incompleteText')"
        />
        <suspense v-else>
          <df-form :key="dataset.href" />
          <template #fallback>
            <div class="d-flex justify-center align-center py-16">
              <v-progress-circular
                :size="60"
                :width="5"
                color="primary"
                indeterminate
              />
            </div>
          </template>
        </suspense>
      </v-container>
    </v-main>
    <DfUiNotif />
  </v-app>
</template>

<i18n lang="yaml">
fr:
  incompleteTitle: Configuration incomplète
  incompleteText: Veuillez sélectionner un jeu de données dans la configuration de l'application.
en:
  incompleteTitle: Incomplete configuration
  incompleteText: Please select a dataset in the application configuration.
</i18n>
