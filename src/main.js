import { createApp } from 'vue'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { defaultOptions } from '@data-fair/lib/vuetify.js'
import App from './App.vue'
import useAppInfo from './composables/useAppInfo'
import { fr } from 'vuetify/locale'

const { config } = useAppInfo()

window.iFrameResizer = {
  heightCalculationMethod: 'taggedElement'
}

defaultOptions.defaults = {
  global: {
    variant: config.variant
  },
  VExpansionPanels: {
    mandatory: 'force'
  },
  VTimePicker: {
    format: '24hr'
  }
}
defaultOptions.locale = {
  locale: 'fr',
  messages: { fr }
}

const app = createApp(App)

app.use(createVuetify(defaultOptions))

app.mount('#app')
