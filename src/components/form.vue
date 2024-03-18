<script setup>
import { ref } from 'vue'
import Vjsf from '@koumoul/vjsf'
import { v2compat } from '@koumoul/vjsf/compat/v2'
import { ofetch } from 'ofetch'
import useAppInfo from '../composables/useAppInfo'
import { token, tokenReady, alert, alertMessage } from '../context.js'

const { config, datasetUrl } = useAppInfo()
const options = { density: config.density, titleDepth: 3, locale: 'fr' }
const v2Schema = (await ofetch(datasetUrl + '/safe-schema?mimeType=application%2Fschema%2Bjson'))
const schema = v2compat(v2Schema)

const groups = {}
const properties = {}
for (const [key, prop] of Object.entries(schema.properties)) {
  if (config.groups !== 'none' && prop['x-group']) {
    groups[prop['x-group']] = groups[prop['x-group']] || { }
    groups[prop['x-group']][key] = prop
  } else {
    properties[key] = prop
  }
}
if (Object.values(groups).length) {
  schema.allOf = Object.entries(groups).map(([title, properties]) => ({ title, properties }))
  schema.layout = config.layout
}
if (Object.values(properties).length) {
  schema.properties = properties
} else {
  delete schema.properties
}
// console.log(schema)
const data = ref({})
const form = ref(null)

const addLine = async () => {
  if (!form.value.validate()) return
  const formData = new FormData()
  // if (this.file) formData.append('attachment', this.file)

  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value)
  }
  try {
    await ofetch(datasetUrl + '/lines', {
      body: formData,
      method: 'POST',
      headers: { 'x-anonymousToken': token.value },
      async onResponseError ({ response }) {
        console.log(response)
        alertMessage.value = response.status + ' - ' + response._data
        alert.value = true
      }
    })
  } catch (err) {}
}
</script>

<template>
  <v-form ref="form">
    <vjsf
      v-model="data"
      :schema="schema"
      :options="options"
    />
  </v-form>
  <v-btn
    color="primary"
    :loading="!tokenReady"
    @click="addLine"
  >
    Envoyer
  </v-btn>
</template>
