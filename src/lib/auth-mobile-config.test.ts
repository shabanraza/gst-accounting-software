import { describe, expect, it } from 'vitest'

import {
  getMobileAuthScheme,
  getMobileTrustedOrigins,
  mergeTrustedOrigins,
} from '#/lib/auth-mobile-config.ts'

describe('auth mobile config', () => {
  it('includes the Expo app scheme in trusted origins', () => {
    expect(getMobileTrustedOrigins()).toEqual(
      expect.arrayContaining(['hisaabkro://', 'exp://']),
    )
  })

  it('uses the hisaabkro deep-link scheme', () => {
    expect(getMobileAuthScheme()).toBe('hisaabkro')
  })

  it('merges mobile and web trusted origins without duplicates', () => {
    expect(
      mergeTrustedOrigins(['https://app.example.com'], ['hisaabkro://']),
    ).toEqual(['https://app.example.com', 'hisaabkro://'])
  })
})
