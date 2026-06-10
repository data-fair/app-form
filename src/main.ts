import 'vuetify/styles'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createSession } from '@data-fair/lib-vue/session.js'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import App from './App.vue'
import { createConfig } from '@/composables/config'

async function init () {
  const session = await createSession({ directoryUrl: '/simple-directory', siteInfo: true })
  const app = createApp(App)
  app.use(createLocaleDayjs(session.lang.value))
  const vuetifyOptions = vuetifySessionOptions(session)
  app.use(createVuetify({
    ...vuetifyOptions,
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
  }))
  app.use(session)
  app.use(createConfig())
  app.use(createUiNotif())
  app.mount('#app')
}

init()
