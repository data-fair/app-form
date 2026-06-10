import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { commonjsDeps } from '@koumoul/vjsf/utils/build.js'

export default defineConfig({
  base: process.env.PUBLIC_URL ?? '/app/',
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/assets/settings.scss'
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
    port: 3000,
    hmr: {
      port: 3000,
      protocol: 'ws'
    }
  },
  optimizeDeps: {
    include: commonjsDeps
  }
})
