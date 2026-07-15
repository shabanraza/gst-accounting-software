import { describe, expect, it } from 'vitest'

import { resolveApiBaseUrl, resolveTrpcUrl } from './env.ts'

describe('mobile env', () => {
  it('defaults to local web API for development', () => {
    expect(resolveApiBaseUrl()).toBe('http://localhost:3000')
    expect(resolveTrpcUrl()).toBe('http://localhost:3000/api/trpc')
  })
})
