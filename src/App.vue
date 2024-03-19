<script setup>
import DfForm from './components/form.vue'
import useAppInfo from './composables/useAppInfo'
import { ofetch } from 'ofetch'
import { alert, alertMessage, submitted } from './context.js'

let configureError, config
try {
  config = useAppInfo().config
} catch (e) {
  configureError = e.message
  ofetch(window.APPLICATION.href + '/error', { body: { message: e.message || e }, method: 'POST' })
}

</script>

<template>
  <v-app>
    <v-main>
      <v-container data-iframe-height>
        <template v-if="!configureError">
          <suspense v-if="!submitted">
            <df-form />
          </suspense>
          <v-alert
            v-else
            type="info"
            class="text-center ma-16"
            :text="config.submitMessage"
          />
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
        </template>
      </v-container>
    </v-main>
  </v-app>
</template>
