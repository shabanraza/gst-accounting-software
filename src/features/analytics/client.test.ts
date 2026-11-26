import { describe, expect, test, vi } from 'vitest'

import { createAnalytics } from '#/features/analytics/client.ts'

function fakeClient() {
  return { capture: vi.fn(), identify: vi.fn(), reset: vi.fn() }
}

describe('createAnalytics', () => {
  test('keeps calls made before the library loads, in order', async () => {
    const client = fakeClient()
    const analytics = createAnalytics()
    analytics.identify('u1')
    analytics.capture('account_created')

    await analytics.start(async () => client)
    analytics.capture('later', { a: 1 })

    expect(client.identify).toHaveBeenCalledWith('u1')
    expect(client.capture.mock.calls).toEqual([
      ['account_created', undefined],
      ['later', { a: 1 }],
    ])
    expect(client.identify.mock.invocationCallOrder[0]).toBeLessThan(
      client.capture.mock.invocationCallOrder[0],
    )
  })

  test('loads once, and holds only a few calls if it never starts', async () => {
    const client = fakeClient()
    const load = vi.fn(async () => client)
    const analytics = createAnalytics()
    for (let index = 0; index < 80; index += 1) analytics.capture(`e${index}`)

    await Promise.all([analytics.start(load), analytics.start(load)])

    expect(load).toHaveBeenCalledTimes(1)
    expect(client.capture).toHaveBeenCalledTimes(50)
  })

  test('a library that fails to load never breaks the app', async () => {
    const analytics = createAnalytics()

    await expect(
      analytics.start(async () => {
        throw new Error('blocked')
      }),
    ).resolves.toBeUndefined()
    expect(() => analytics.capture('x')).not.toThrow()
  })
})
