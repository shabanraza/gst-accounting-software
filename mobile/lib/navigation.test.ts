import { describe, expect, it } from 'vitest'

import { shouldShowBackButton } from './navigation'

describe('shouldShowBackButton', () => {
  it('hides back on tab roots', () => {
    expect(shouldShowBackButton('tab')).toBe(false)
  })

  it('shows back on stack screens by default', () => {
    expect(shouldShowBackButton('stack')).toBe(true)
  })

  it('allows explicit back override on stack screens', () => {
    expect(shouldShowBackButton('stack', false)).toBe(false)
  })
})
