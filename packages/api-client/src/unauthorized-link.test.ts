import { describe, expect, it } from 'vitest'

import {
  createUnauthorizedLink,
  isUnauthorizedTrpcError,
} from './unauthorized-link.ts'

describe('isUnauthorizedTrpcError', () => {
  it('detects unauthorized tRPC errors', () => {
    expect(
      isUnauthorizedTrpcError({ data: { code: 'UNAUTHORIZED' } }),
    ).toBe(true)
    expect(isUnauthorizedTrpcError(new Error('FORBIDDEN'))).toBe(false)
  })
})

describe('createUnauthorizedLink', () => {
  it('creates a tRPC link', () => {
    const onUnauthorized = () => {}
    expect(createUnauthorizedLink(onUnauthorized)).toBeTypeOf('function')
  })
})
