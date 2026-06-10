import { ref, onMounted } from 'vue'
import { ofetch } from 'ofetch'
import { useConfig } from './config'
import { useSession } from '@data-fair/lib-vue/session.js'

function decodeJWT (token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(payload)
    return JSON.parse(json)
  } catch {
    return null
  }
}

interface TokenState {
  token: ReturnType<typeof ref<string | null>>
  tokenReady: ReturnType<typeof ref<boolean>>
  tokenError: ReturnType<typeof ref<boolean>>
  fetchPromise: Promise<string> | null
  timeoutId: ReturnType<typeof setTimeout> | null
}

const tokenStates = new Map<string, TokenState>()

function getTokenState (key: string): TokenState {
  if (!tokenStates.has(key)) {
    tokenStates.set(key, {
      token: ref(null),
      tokenReady: ref(false),
      tokenError: ref(false),
      fetchPromise: null,
      timeoutId: null
    })
  }
  return tokenStates.get(key)!
}

async function doFetch (state: TokenState, directoryUrl: string) {
  if (state.fetchPromise) return state.fetchPromise

  state.fetchPromise = ofetch<string>(`${directoryUrl}/api/auth/anonymous-action`)

  try {
    const fetchedToken = await state.fetchPromise
    state.token.value = fetchedToken
    const payload = decodeJWT(fetchedToken)
    const nbf = payload && typeof payload.nbf === 'number' ? payload.nbf : null
    if (nbf) {
      const delay = Math.max(0, nbf * 1000 - Date.now() + 500)
      if (delay > 0) {
        if (state.timeoutId) clearTimeout(state.timeoutId)
        await new Promise<void>((resolve) => {
          state.timeoutId = setTimeout(() => {
            state.timeoutId = null
            resolve()
          }, delay)
        })
      }
    }
  } catch (e) {
    console.error('Failed to fetch anonymous token', e)
    state.tokenError.value = true
  } finally {
    state.fetchPromise = null
  }

  if (state.token.value) {
    state.tokenReady.value = true
  }
}

function resetToken (state: TokenState) {
  if (state.timeoutId) {
    clearTimeout(state.timeoutId)
    state.timeoutId = null
  }
  state.fetchPromise = null
  state.token.value = null
  state.tokenReady.value = false
  state.tokenError.value = false
}

export function useAnonymousToken (tokenKey: string = 'default') {
  const { accessKey, directoryUrl } = useConfig()
  const session = useSession()

  onMounted(async () => {
    const state = getTokenState(tokenKey)

    if (state.tokenReady.value) return

    if (!accessKey.value) {
      state.tokenReady.value = true
      return
    }

    if (session?.state?.user?.id) {
      state.tokenReady.value = true
      return
    }

    await doFetch(state, directoryUrl.value)
  })

  const state = getTokenState(tokenKey)
  return { token: state.token, tokenReady: state.tokenReady, tokenError: state.tokenError, reset: () => resetToken(state) }
}
