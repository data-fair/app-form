<script setup>
import DfForm from './components/form.vue'
import useAppInfo from './composables/useAppInfo'
import { ofetch } from 'ofetch'
import { alert, alertMessage } from './context.js'

let configureError
try {
  useAppInfo()
} catch (e) {
  configureError = e.message
  ofetch(window.APPLICATION.href + '/error', { body: { message: e.message || e }, method: 'POST' })
}

</script>

<template>
  <v-app>
    <v-main>
      <v-container data-iframe-height>
        <suspense v-if="!configureError">
          <df-form />
        </suspense>
        <v-snackbar
          v-model="alert"
          multi-line
        >
          {{ alertMessage }}
          <template #actions>
            <v-btn
              color="red"
              variant="text"
              @click="alert = false"
            >
              Ok
            </v-btn>
          </template>
        </v-snackbar>
      </v-container>
    </v-main>
  </v-app>
</template>
