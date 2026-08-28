import vue from '@vitejs/plugin-vue'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { commonjsDeps } from '@koumoul/vjsf/utils/build.js'
import { settingsPath } from '@data-fair/lib-vuetify/vite.js'

export default defineConfig({
  base: process.env.PUBLIC_URL ?? '/app/',
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    vueI18n({}),
    vuetify({
      autoImport: true,
      styles: {
        configFile: settingsPath
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue']
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
    hmr: {
      port: Number(process.env.PORT ?? 3000),
      protocol: 'ws'
    }
  },
  optimizeDeps: {
    include: commonjsDeps
  }
})
