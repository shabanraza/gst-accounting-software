import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkApiHealth } from './api-health.ts'

describe('checkApiHealth', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('reports success when the auth endpoint responds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      }),
    )

    await expect(checkApiHealth()).resolves.toEqual({ ok: true })
  })

  it('reports success for unauthorized auth responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    )

    await expect(checkApiHealth()).resolves.toEqual({ ok: true })
  })

  it('reports a helpful message when the API is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    const result = await checkApiHealth()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('Cannot reach the API')
      expect(result.message).toContain('dev:lan')
    }
  })
})
