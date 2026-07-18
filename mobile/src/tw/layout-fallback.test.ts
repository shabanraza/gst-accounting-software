import { describe, expect, it } from 'vitest'

import { mergeLayoutFallbackStyles } from './layout-fallback-core'

describe('mergeLayoutFallbackStyles', () => {
  it('prepends flex fallback after css styles', () => {
    expect(
      mergeLayoutFallbackStyles('flex-1 bg-background', { paddingTop: 8 }),
    ).toEqual([{ flex: 1 }, { paddingTop: 8 }])
  })

  it('combines multiple layout fallbacks for flex containers', () => {
    expect(
      mergeLayoutFallbackStyles('flex-1 items-center justify-center gap-4', undefined),
    ).toEqual({
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    })
  })

  it('returns the same object reference for repeated flex-1 merges', () => {
    const first = mergeLayoutFallbackStyles('flex-1 bg-background', undefined)
    const second = mergeLayoutFallbackStyles('flex-1 bg-background', undefined)
    expect(first).toBe(second)
  })
})
