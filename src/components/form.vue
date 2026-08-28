<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Vjsf from '@koumoul/vjsf'
import { v2compat } from '@koumoul/vjsf/compat/v2'
import { ofetch } from 'ofetch'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'
import { useConfig } from '@/composables/config'
import { useAnonymousToken } from '@/composables/anonymous-token'
import { useSession } from '@data-fair/lib-vue/session.js'
import { buildSchema } from '@/utils/build-schema'
import type { VJSFSchema } from '@/types'

const { config, dataset, accessKey } = useConfig()
const session = useSession()
const { token, tokenReady, reset: resetToken } = useAnonymousToken('lines')

const datasetUrl = computed(() => dataset.value?.href ?? '')
const schemaUrl = computed(() => `${datasetUrl.value}/safe-schema?mimeType=application%2Fschema%2Bjson`)

const { data: rawV2Schema, loading: schemaLoading, error: schemaError } = useFetch<unknown>(schemaUrl)

const baseSchema = ref<VJSFSchema | null>(null)
const schema = ref<VJSFSchema | null>(null)
const attachmentKey = ref<string | null>(null)
const schemaKey = ref(0)

function rebuildSchema () {
  if (!baseSchema.value) return
  const { schema: built, attachmentKey: key } = buildSchema(baseSchema.value, {
    layout: config.value.layout,
    groups: config.value.groups,
    attachmentsAsImage: dataset.value?.attachmentsAsImage
  })
  attachmentKey.value = key
  schema.value = built
  schemaKey.value++
}

watch(rawV2Schema, (v) => {
  if (!v) return
  baseSchema.value = v2compat(v) as VJSFSchema
  rebuildSchema()
}, { immediate: true })

// Débloque le service de capture dès que le formulaire est réellement rendu
// (sinon chaque capture attend le délai complet de df:capture-delay).
// Capture en image fixe (pas d'animation) : le formulaire n'a pas de rendu
// animé, et un mode gif exigerait de définir window.animateCaptureFrame.
watch(schema, (v) => {
  if (!v) return
  nextTick(() => window.triggerCapture?.())
}, { immediate: true })

watch(schemaError, (e) => {
  if (!e) return
  window.triggerCapture?.()
})

watch([
  () => config.value.layout,
  () => config.value.groups
], () => {
  rebuildSchema()
})

const options = computed(() => ({
  density: config.value.density,
  titleDepth: 3,
  locale: session.lang.value,
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
