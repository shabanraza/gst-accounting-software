import { describe, expect, it } from 'vitest'

import { formatAuthNetworkError } from './auth-error.ts'

describe('formatAuthNetworkError', () => {
  it('explains when the API is unreachable', () => {
    const message = formatAuthNetworkError(new TypeError('Failed to fetch'))

    expect(message).toContain('Cannot reach the API')
    expect(message).toContain('http://localhost:3000')
    expect(message).toContain('bun run dev')
  })

  it('returns the original message for non-network errors', () => {
    expect(formatAuthNetworkError(new Error('Invalid credentials'))).toBe(
      'Invalid credentials',
    )
  })
})
