import { describe, expect, test, vi } from 'vitest'

import { createErrorReporter } from '#/features/analytics/error-reporter.ts'

describe('createErrorReporter', () => {
  test('sends errors raised before monitoring loads, then later ones', async () => {
    const capture = vi.fn()
    const reporter = createErrorReporter()
    const early = new Error('early')
    reporter.report(early)

    await reporter.start(async () => capture)
    const late = new Error('late')
    reporter.report(late)

    expect(capture.mock.calls).toEqual([[early], [late]])
  })

  test('holds only a few errors, and a failed load stays silent', async () => {
    const capture = vi.fn()
    const reporter = createErrorReporter()
    for (let index = 0; index < 30; index += 1) reporter.report(index)
    await reporter.start(async () => capture)
    expect(capture).toHaveBeenCalledTimes(10)

    const blocked = createErrorReporter()
    await expect(
      blocked.start(async () => {
        throw new Error('blocked')
      }),
    ).resolves.toBeUndefined()
    expect(() => blocked.report('x')).not.toThrow()
  })
})
