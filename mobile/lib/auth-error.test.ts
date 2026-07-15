import { describe, expect, it } from 'vitest'

import { formatAuthNetworkError } from './auth-error.ts'

describe('formatAuthNetworkError', () => {
  it('explains when the API is unreachable', () => {
    const message = formatAuthNetworkError(new TypeError('Failed to fetch'))

    expect(message).toContain('Cannot reach the API')
    expect(message).toContain('http://localhost:3000')
    expect(message).toContain('dev:lan')
    expect(message).toContain('EXPO_PUBLIC_API_URL')
  })

  it('returns the original message for non-network errors', () => {
    expect(formatAuthNetworkError(new Error('Invalid credentials'))).toBe(
      'Invalid credentials',
    )
  })
})
