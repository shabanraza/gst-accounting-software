import { describe, expect, it } from 'vitest'

import {
  getMobileAuthScheme,
  getMobileTrustedOrigins,
  mergeTrustedOrigins,
} from '#/lib/auth-mobile-config.ts'

describe('auth mobile config', () => {
  it('includes the Expo app scheme in trusted origins', () => {
    expect(getMobileTrustedOrigins()).toEqual(
      expect.arrayContaining(['gstbooks://', 'exp://']),
    )
  })

  it('uses the gstbooks deep-link scheme', () => {
    expect(getMobileAuthScheme()).toBe('gstbooks')
  })

  it('merges mobile and web trusted origins without duplicates', () => {
    expect(
      mergeTrustedOrigins(['https://app.example.com'], ['gstbooks://']),
    ).toEqual(['https://app.example.com', 'gstbooks://'])
  })
})
