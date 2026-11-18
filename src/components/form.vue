<script setup lang="ts">
import type { VJSFSchema } from '@/types'
import type { VForm } from 'vuetify/components'
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import Vjsf from '@koumoul/vjsf'
import { v2compat } from '@koumoul/vjsf/compat/v2'
import { ofetch } from 'ofetch'
import { useI18n } from 'vue-i18n'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'
import { useConfig } from '@/composables/config'
import { useAnonymousToken } from '@/composables/anonymous-token'
import { useSession } from '@data-fair/lib-vue/session.js'
import { buildSchema } from '@/utils/build-schema'

const { t } = useI18n()
const { config, dataset, accessKey } = useConfig()
const session = useSession()
const { token, tokenReady, reset: resetToken } = useAnonymousToken('lines')

const datasetUrl = computed(() => dataset.value?.href ?? '')
const schemaUrl = computed(() => `${datasetUrl.value}/safe-schema?mimeType=application%2Fschema%2Bjson`)

const { sendUiNotif } = useUiNotif()
// the default notification of useFetch only shows the raw API message
const { data: rawV2Schema, loading: schemaLoading, error: schemaError } = useFetch<unknown>(schemaUrl, { notifError: false })

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

// Unblocks the capture service as soon as the form is actually rendered
// (otherwise each capture waits for the full df:capture-delay).
// Still image capture (no animation): the form has no animated rendering,
// and a gif mode would require defining window.animateCaptureFrame.
watch(schema, (v) => {
  if (!v) return
  nextTick(() => window.triggerCapture?.())
}, { immediate: true })

watch(schemaError, (e) => {
  if (!e) return
  sendUiNotif({ type: 'error', msg: t('loadError'), error: e })
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
  removeAdditional: true
}))

const data = ref<Record<string, unknown>>({})
const formRef = ref<VForm | null>(null)
// the json-layout state, only used to apply a debounced input before validating
const statefulLayout = shallowRef<{ applyDebouncedInput: () => void } | null>(null)
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
  { error: t('submitError') }
)

// the button stays enabled on an invalid form, as in the portals contact form: a disabled
// button tells nothing about what is missing and cannot be reached with the keyboard
async function onSubmit () {
  // a text input reaches the data 300 ms after the last keystroke (debounceInputMs): without this,
  // typing the last field and clicking at once validates the previous value and sends nothing
  statefulLayout.value?.applyDebouncedInput()
  const result = await formRef.value?.validate()
  if (result?.valid) {
    submit()
    return
  }
  // validate() reveals the errors of every field: focus the first one, which also scrolls to it
  await nextTick()
  const firstError = formRef.value?.$el.querySelector('.v-input--error input, .v-input--error textarea')
  firstError?.focus()
}
</script>

<template>
  <div>
    <div
      v-if="schemaLoading"
      class="d-flex justify-center align-center py-16"
    >
      <v-progress-circular
        :size="60"
        :width="5"
        color="primary"
        indeterminate
      />
    </div>
    <v-alert
      v-else-if="submitted"
      type="success"
      class="my-4"
      :text="config.submitMessage || t('submitted')"
    />
    <template v-else-if="schema">
      <v-form ref="formRef">
        <!-- hide-details auto: no empty message row reserved under every field, errors still show -->
        <v-defaults-provider :defaults="{ global: { variant: config.variant, hideDetails: 'auto' } }">
          <vjsf
            :key="schemaKey"
            v-model="data"
            :schema="schema"
            :options="options"
            @update:state="(state: { applyDebouncedInput: () => void }) => statefulLayout = state"
          />
        </v-defaults-provider>
      </v-form>
      <!-- mousedown.prevent: the field keeps the focus until the click. Its blur would apply the
           pending input and remove its error message, the button would move up under the pointer
           and the click would be lost. onSubmit applies the pending input itself. -->
      <div class="d-flex justify-center mt-4">
        <v-btn
          color="primary"
          variant="elevated"
          :loading="submitting || (accessKey !== null && !tokenReady)"
          :disabled="submitting || (accessKey !== null && !tokenReady)"
          @mousedown.prevent
          @click="onSubmit"
        >
          {{ t('submit') }}
        </v-btn>
      </div>
    </template>
  </div>
</template>

<i18n lang="yaml">
fr:
  submit: Envoyer
  submitted: Merci, votre réponse a bien été enregistrée !
  submitError: Erreur lors de l'envoi de la réponse
  loadError: Erreur lors du chargement du formulaire
en:
  submit: Send
  submitted: Thank you, your answer has been recorded!
  submitError: Error while sending the answer
  loadError: Error while loading the form
</i18n>
