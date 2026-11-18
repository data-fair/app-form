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

async function init () {
  const session = await createSession({
    directoryUrl: '/simple-directory',
    // _public.js (index.html) sets the site info without a request, the fetch is only a fallback
    siteInfo: !window.__PUBLIC_SITE_INFO
  })
  // created once the session is known: the locale is never reassigned afterwards
  // (a language change reloads the document)
  const i18n = createI18n({ legacy: false, locale: session.lang.value, fallbackLocale: 'en' })
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
