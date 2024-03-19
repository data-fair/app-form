import { ref, watch } from 'vue'
import { computedAsync } from '@vueuse/core'
import { ofetch } from 'ofetch'
import useAppInfo from './composables/useAppInfo'

const { directoryUrl } = useAppInfo()

export const token = computedAsync(async () => {
  return await ofetch(`${directoryUrl}/api/auth/anonymous-action`)
})

export const tokenReady = ref(false)
export const submitted = ref(false)
export const alert = ref(false)
export const alertMessage = ref('')

watch(token, () => {
  setTimeout(() => {
    tokenReady.value = true
  }, 8000)
})
