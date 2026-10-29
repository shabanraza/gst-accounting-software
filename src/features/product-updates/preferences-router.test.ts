import { describe, expect, test } from 'vitest'

import { createPreferencesRouter } from '#/features/product-updates/preferences-router.ts'
import { createProductUpdatesService } from '#/features/product-updates/product-updates-service.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { StoredPreference } from '#/features/product-updates/product-updates-service.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

function caller(session: TRPCContext['session']) {
  const rows = new Map<string, StoredPreference>()
  const service = createProductUpdatesService({
    store: {
      get: async (userId) => rows.get(userId) ?? null,
      save: async (userId, row) => void rows.set(userId, row),
    },
    audience: null,
  })
  const router = createTRPCRouter({
    preferences: createPreferencesRouter(service),
  })
  return router.createCaller({
    session,
    request: new Request('http://localhost/api/trpc'),
  })
}

describe('preferencesRouter', () => {
  test('saves the signed-in user’s product-update choice', async () => {
    const api = caller({
      user: { id: 'u1', email: 'asha@example.com', name: 'Asha' },
      session: { id: 's1', userId: 'u1' },
    })

    await expect(api.preferences.productUpdates()).resolves.toMatchObject({
      enabled: false,
    })
    await api.preferences.setProductUpdates({ enabled: true })
    await expect(api.preferences.productUpdates()).resolves.toMatchObject({
      enabled: true,
    })
  })

  test('requires a signed-in user', async () => {
    const api = caller(null)

    await expect(api.preferences.productUpdates()).rejects.toThrow('UNAUTHORIZED')
    await expect(
      api.preferences.setProductUpdates({ enabled: true }),
    ).rejects.toThrow('UNAUTHORIZED')
  })
})
