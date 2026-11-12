import '@data-fair/lib-vuetify/style/global.scss'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createSession } from '@data-fair/lib-vue/session.js'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { createI18n } from 'vue-i18n'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import App from './App.vue'
import { createConfig } from '@/composables/config'

// Expose reactiveSearchParams to the v-iframe-compat shim injected by DataFair
// to avoid full page reloads when the app is itself embedded in a parent d-frame
// (portal, dashboard, another app via <d-frame>). Must be set at module level,
// BEFORE createApp().
window.vIframeOptions = { reactiveParams: reactiveSearchParams }

// createI18n MUST be created at module level (not in init()):
// several @data-fair/lib-vuetify components (ui-notif, colors-preview,
// layout-empty-state, layout-fetch-error, ...) call useI18n() when the
// module is evaluated. If the creation is deferred, these modules get
// an uninitialized i18n instance and the lib translations do not
// work (snackbar, empty state, error page).
const i18n = createI18n({ legacy: false, locale: 'fr', fallbackLocale: 'en' })

async function init () {
  const session = await createSession({ directoryUrl: '/simple-directory' })
  i18n.global.locale.value = session.lang.value
  const app = createApp(App)
  app.use(createLocaleDayjs(session.lang.value))
  const vuetifyOptions = vuetifySessionOptions(session)
  app.use(createVuetify({
    ...vuetifyOptions,
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
  }))
  app.use(session)
  app.use(i18n)
  app.use(createConfig())
  app.use(createUiNotif())
  app.mount('#app')
}

init().catch((e) => {
  console.error('Failed to initialize app', e)
  // Unblocks the capture service even when the initialization fails
  // (otherwise each capture waits for the full df:capture-delay).
  window.triggerCapture?.()
})
