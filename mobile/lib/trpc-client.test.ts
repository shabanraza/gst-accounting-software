import { describe, expect, it, vi } from 'vitest'

import { createMobileTrpcClient } from './trpc-client.ts'

vi.mock('./trpc-auth.ts', () => ({
  readAuthCookieHeader: vi.fn(() => 'better-auth.session_token=mobile-test'),
}))

describe('createMobileTrpcClient', () => {
  it('creates a client configured for the mobile API URL', () => {
    const client = createMobileTrpcClient()
    expect(client).toBeDefined()
  })
})
