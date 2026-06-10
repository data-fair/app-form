import neostandard from 'neostandard'
import pluginVuetify from 'eslint-plugin-vuetify'
import vueParser from 'vue-eslint-parser'
import tsParser from '@typescript-eslint/parser'
import dfLibRecommended from '@data-fair/lib-utils/eslint/recommended.js'

export default [
  ...dfLibRecommended,
  ...pluginVuetify.configs['flat/recommended-v4'],
  ...neostandard(),
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser
      }
    }
  },
  {
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        getComputedStyle: 'readonly'
      }
    }
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off'
    }
  },
  { ignores: ['dist/*', 'node_modules/*', 'src/config/.type/*', 'public/*'] }
]
