import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_HEALTH_CHECK_TIMEOUT_MS,
  buildApiHealthTimeoutMessage,
  checkApiHealthWithTimeout,
} from './api-health-timeout.ts'

describe('checkApiHealthWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns the health result when the check finishes in time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      }),
    )

    const resultPromise = checkApiHealthWithTimeout(5_000)
    await vi.runAllTimersAsync()

    await expect(resultPromise).resolves.toEqual({ ok: true })
  })

  it('returns a timeout message when the health check hangs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise(() => {
            /* never resolves */
          }),
      ),
    )

    const resultPromise = checkApiHealthWithTimeout(1_000)
    await vi.advanceTimersByTimeAsync(1_000)

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      message: buildApiHealthTimeoutMessage(1_000),
    })
  })

  it('uses a 10 second default timeout', () => {
    expect(buildApiHealthTimeoutMessage(API_HEALTH_CHECK_TIMEOUT_MS)).toContain(
      '10s',
    )
  })
})
