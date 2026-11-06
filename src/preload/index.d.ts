import type { SampleTextApi } from '@shared/types'

declare global {
  interface Window {
    sampleText: SampleTextApi
  }
}

export {}