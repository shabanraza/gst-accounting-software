import { describe, expect, it, vi } from 'vitest'

import { createMobileTrpcClient } from './trpc-client.ts'

vi.mock('./auth-client.ts', () => ({
  authClient: {
    getCookie: vi.fn(() => 'better-auth.session=mobile-test'),
  },
}))

describe('createMobileTrpcClient', () => {
  it('creates a client configured for the mobile API URL', () => {
    const client = createMobileTrpcClient()
    expect(client).toBeDefined()
  })
})
