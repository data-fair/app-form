/// <reference types="vite/client" />

import type { Application } from '@data-fair/lib-common-types/application/index.js'

declare global {
  interface Window {
    APPLICATION: Application & {
      apiUrl: string
      owner: Application['owner'] & { name?: string }
    }
    iFrameResizer?: { heightCalculationMethod: string }
  }
}

export {}
