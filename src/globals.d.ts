/// <reference types="vite/client" />

import type { Application } from '@data-fair/lib-common-types/application/index.js'
import type { FullSiteInfo } from '@data-fair/lib-vue/session.js'

declare global {
  interface Window {
    APPLICATION: Application & {
      apiUrl: string
      owner: Application['owner'] & { name?: string }
    }
    // set by _public.js, read by the session instead of the deprecated fetch
    __PUBLIC_SITE_INFO?: FullSiteInfo
    iFrameResizer?: { heightCalculationMethod: string }
    /** Options lues par le shim v-iframe-compat injecté par DataFair (df:sync-state). */
    vIframeOptions?: { reactiveParams: unknown }
    /** Fonction injectée par le service de capture DataFair. Résout vers `animate` (true = mode gif). */
    triggerCapture?: (animationSupported?: boolean) => Promise<boolean>
  }
}

export {}
