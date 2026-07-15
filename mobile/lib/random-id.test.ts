import { describe, expect, it } from 'vitest'

import { randomId } from './random-id.ts'

describe('randomId', () => {
  it('returns a uuid-shaped string', () => {
    const id = randomId()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 20 }, () => randomId()))
    expect(ids.size).toBe(20)
  })

  it('falls back when global crypto is unavailable', () => {
    const originalCrypto = (globalThis as { crypto?: Crypto }).crypto
    try {
      Reflect.deleteProperty(globalThis, 'crypto')
      const id = randomId()
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    } finally {
      if (originalCrypto) {
        ;(globalThis as { crypto?: Crypto }).crypto = originalCrypto
      }
    }
  })
})
