<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Vjsf from '@koumoul/vjsf'
import { v2compat } from '@koumoul/vjsf/compat/v2'
import { ofetch } from 'ofetch'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'
import { useConfig } from '@/composables/config'
import { useAnonymousToken } from '@/composables/anonymous-token'
import type { VJSFSchema, VJSFProperty } from '@/types'

const { config, dataset, accessKey } = useConfig()
const { token, tokenReady, reset: resetToken } = useAnonymousToken('lines')

const datasetUrl = computed(() => dataset.value.href)
const schemaUrl = computed(() => `${datasetUrl.value}/safe-schema?mimeType=application%2Fschema%2Bjson`)

const { data: rawV2Schema, loading: schemaLoading } = useFetch<unknown>(schemaUrl)

const baseSchema = ref<VJSFSchema | null>(null)
const schema = ref<VJSFSchema | null>(null)
const attachmentKey = ref<string | null>(null)
const schemaKey = ref(0)

function buildSchema (s: VJSFSchema) {
  const localSchema: VJSFSchema = JSON.parse(JSON.stringify(s))

  Object.entries(localSchema.properties ?? {}).forEach(([key, value]) => {
    const v = value as VJSFProperty
    if (!v.title) v.title = key
  })

  const attachmentEntry = Object.entries(localSchema.properties ?? {}).find(([, f]) => (f as VJSFProperty)['x-concept']?.id === 'attachment')
  if (attachmentEntry) {
    attachmentKey.value = attachmentEntry[0]
    delete (localSchema.properties as Record<string, VJSFProperty>)[attachmentEntry[0]]
    localSchema.properties = localSchema.properties ?? {}
    localSchema.properties.__file = {
      title: (attachmentEntry[1] as VJSFProperty).title || (dataset.value.attachmentsAsImage ? 'Image' : 'Document numérique attaché'),
      type: 'object',
      layout: 'file-input'
    }
    const g = (attachmentEntry[1] as VJSFProperty)['x-group']
    if (g) localSchema.properties.__file['x-group'] = g
  }

  if (config.value.layout !== 'none') {
    const groups: Record<string, Record<string, VJSFProperty>> = {}
    const properties: Record<string, VJSFProperty> = {}
    for (const [key, prop] of Object.entries(localSchema.properties ?? {}) as [string, VJSFProperty][]) {
      if (config.value.groups !== 'none' && prop['x-group']) {
        groups[prop['x-group']] = groups[prop['x-group']] || {}
        groups[prop['x-group']][key] = prop
      } else {
        properties[key] = prop
      }
    }
    if (Object.values(groups).length) {
      localSchema.allOf = Object.entries(groups).map(([title, properties]) => ({ title, properties }))
      localSchema.layout = config.value.layout
    }
    if (Object.values(properties).length) {
      localSchema.properties = properties
    } else {
      delete localSchema.properties
    }
  }

  schema.value = localSchema
  schemaKey.value++
}

watch(rawV2Schema, (v) => {
  if (!v) return
  const s = v2compat(v) as VJSFSchema
  baseSchema.value = s
  buildSchema(s)
}, { immediate: true })

watch([
  () => config.value.layout,
  () => config.value.groups
], () => {
  if (baseSchema.value) buildSchema(baseSchema.value)
})

const options = computed(() => ({
  density: config.value.density,
  titleDepth: 3,
  locale: 'fr',
  removeAdditional: true,
  initialValidation: 'always'
}))

const data = ref<Record<string, unknown>>({})
const valid = ref(false)
const submitted = ref(false)

async function buildFormData () {
  const formData = new FormData()
  const dataValue = data.value
  const { __file } = dataValue

  const schemaKeys = new Set<string>(
    Object.keys(baseSchema.value?.properties ?? {}).filter(key => !key.startsWith('_') && key !== attachmentKey.value)
  )
  const dataBody: Record<string, unknown> = {}
  for (const key of schemaKeys) {
    dataBody[key] = key in dataValue ? dataValue[key] : null
  }

  formData.append('_body', JSON.stringify(dataBody))
  if (__file) formData.append('attachment', __file as Blob)

  return {
    url: `${datasetUrl.value}/lines`,
    params: {
      method: 'POST',
      body: formData,
      headers: { 'Content-Disposition': 'form-data' }
    } as { method: string; body: FormData; headers: Record<string, string> }
  }
}

const { execute: submit, loading: submitting } = useAsyncAction(
  async () => {
    const { url, params } = await buildFormData()
    if (accessKey.value) {
      params.headers['x-anonymousToken'] = token.value!
    }
    await ofetch(url, params)
    submitted.value = true
    if (accessKey.value) resetToken()
  },
  { error: 'Erreur lors de l\'envoi de la réponse' }
)

function onSubmit () {
  if (!valid.value) return
  submit()
}
</script>

<template>
  <div>
    <template v-if="schemaLoading">
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
    <template v-else-if="submitted">
      <v-alert
        type="success"
        class="text-center ma-16"
        :text="config.submitMessage || 'Merci, votre réponse a bien été enregistrée !'"
      />
    </template>
    <template v-else-if="schema">
      <v-form v-model="valid">
        <v-defaults-provider :defaults="{ global: { variant: config.variant } }">
          <vjsf
            :key="schemaKey"
            v-model="data"
            :schema="schema"
            :options="options"
          />
        </v-defaults-provider>
      </v-form>
      <v-row>
        <v-col class="text-center">
          <v-btn
            color="primary"
            variant="elevated"
            :loading="submitting || (accessKey !== null && !tokenReady)"
            :disabled="!valid || submitting || (accessKey !== null && !tokenReady)"
            @click="onSubmit"
          >
            Envoyer
          </v-btn>
        </v-col>
      </v-row>
    </template>
  </div>
</template>
