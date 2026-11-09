/// <reference types="vite/client" />

import type { HandrailApi } from '@shared/ipc'

declare global {
  interface Window {
    /** Exposed by the preload script. */
    handrail: HandrailApi
  }
}
