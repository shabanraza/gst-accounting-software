import { describe, expect, test } from 'vitest'

import { createFixedWindowRateLimiter } from '#/features/documents/public-rate-limit.ts'

describe('createFixedWindowRateLimiter', () => {
  test('allows up to the limit per key, then blocks until the window resets', () => {
    let clock = 0
    const limiter = createFixedWindowRateLimiter({
      limit: 3,
      windowMs: 60_000,
      now: () => clock,
    })

    expect([1, 2, 3].map(() => limiter.take('ip-a'))).toEqual([
      true,
      true,
      true,
    ])
    expect(limiter.take('ip-a')).toBe(false)
    expect(limiter.take('ip-b')).toBe(true)

    clock = 60_000
    expect(limiter.take('ip-a')).toBe(true)
  })

  test('stays bounded in memory when many keys arrive', () => {
    let clock = 0
    const limiter = createFixedWindowRateLimiter({
      limit: 1,
      windowMs: 1000,
      maxKeys: 10,
      now: () => clock,
    })
    for (let index = 0; index < 50; index += 1) limiter.take(`ip-${index}`)
    expect(limiter.size()).toBeLessThanOrEqual(10)

    clock = 5000
    expect(limiter.take('ip-0')).toBe(true)
  })
})
