import { describe, expect, it, vi } from 'vitest'

import { createMobileTrpcClient } from './trpc-client.ts'

vi.mock('./trpc-auth.ts', () => ({
  readTrpcAuthHeaders: vi.fn(() => ({
    Authorization: 'Bearer mobile-test-token',
  })),
}))

vi.mock('./session-expired.ts', () => ({
  handleUnauthorizedSession: vi.fn(),
}))

describe('createMobileTrpcClient', () => {
  it('creates a client configured for the mobile API URL', () => {
    const client = createMobileTrpcClient()
    expect(client).toBeDefined()
  })
})
