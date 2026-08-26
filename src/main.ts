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

// createI18n DOIT être créé au niveau module (pas dans init()) :
// plusieurs composants de @data-fair/lib-vuetify (ui-notif, colors-preview,
// layout-empty-state, layout-fetch-error, ...) appellent useI18n() à
// l'évaluation du module. Si la création est différée, ces modules reçoivent
// une instance i18n non initialisée et les traductions de la lib ne
// fonctionnent pas (snackbar, empty state, page d'erreur).
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
  // Débloque le service de capture même en cas d'échec d'initialisation
  // (sinon chaque capture attend le délai complet de df:capture-delay).
  window.triggerCapture?.()
})
