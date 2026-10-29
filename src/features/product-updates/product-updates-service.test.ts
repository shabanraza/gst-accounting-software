import { describe, expect, test, vi } from 'vitest'

import { createProductUpdatesService } from '#/features/product-updates/product-updates-service.ts'

import type {
  ProductUpdatesAudience,
  StoredPreference,
} from '#/features/product-updates/product-updates-service.ts'

const user = { id: 'u1', email: 'asha@example.com', name: 'Asha' }
const now = new Date('2026-10-28T10:00:00Z')
const earlier = new Date('2026-01-01T10:00:00Z')

function memoryStore(initial: StoredPreference | null = null) {
  let row = initial
  return {
    get row() {
      return row
    },
    store: {
      get: vi.fn(async () => row),
      save: vi.fn(async (_userId: string, next: StoredPreference) => {
        row = next
      }),
    },
  }
}

function fakeAudience(subscribed = true) {
  return {
    subscribe: vi.fn(async () => {}),
    unsubscribe: vi.fn(async () => {}),
    isSubscribed: vi.fn(async () => subscribed),
  } satisfies ProductUpdatesAudience
}

describe('product updates preference', () => {
  test('is off with no consent date for a user who never chose', async () => {
    const { store } = memoryStore()
    const audience = fakeAudience()
    const service = createProductUpdatesService({ store, audience, now: () => now })

    await expect(service.getPreference(user)).resolves.toEqual({
      enabled: false,
      consentedAt: null,
    })
    expect(audience.isSubscribed).not.toHaveBeenCalled()
  })

  test('opting in subscribes the user and records when consent was given', async () => {
    const memory = memoryStore()
    const audience = fakeAudience()
    const service = createProductUpdatesService({
      store: memory.store,
      audience,
      now: () => now,
    })

    await expect(service.setPreference(user, true)).resolves.toEqual({
      enabled: true,
      consentedAt: now,
    })
    expect(audience.subscribe).toHaveBeenCalledWith({
      email: 'asha@example.com',
      name: 'Asha',
    })
    expect(memory.row).toEqual({
      productUpdates: true,
      consentedAt: now,
      withdrawnAt: null,
    })
  })

  test('opting in again keeps the original consent date', async () => {
    const memory = memoryStore({
      productUpdates: true,
      consentedAt: earlier,
      withdrawnAt: null,
    })
    const service = createProductUpdatesService({
      store: memory.store,
      audience: fakeAudience(),
      now: () => now,
    })

    await service.setPreference(user, true)

    expect(memory.row?.consentedAt).toEqual(earlier)
  })

  test('opting out unsubscribes the user and records the withdrawal', async () => {
    const memory = memoryStore({
      productUpdates: true,
      consentedAt: earlier,
      withdrawnAt: null,
    })
    const audience = fakeAudience()
    const service = createProductUpdatesService({
      store: memory.store,
      audience,
      now: () => now,
    })

    await expect(service.setPreference(user, false)).resolves.toEqual({
      enabled: false,
      consentedAt: earlier,
    })
    expect(audience.unsubscribe).toHaveBeenCalledWith('asha@example.com')
    expect(audience.subscribe).not.toHaveBeenCalled()
    expect(memory.row).toEqual({
      productUpdates: false,
      consentedAt: earlier,
      withdrawnAt: now,
    })
  })

  test('leaves the preference unchanged when Resend rejects the change', async () => {
    const memory = memoryStore()
    const audience = fakeAudience()
    audience.subscribe.mockRejectedValueOnce(new Error('Resend 500'))
    const service = createProductUpdatesService({
      store: memory.store,
      audience,
      now: () => now,
    })

    await expect(service.setPreference(user, true)).rejects.toThrow('Resend 500')
    expect(memory.store.save).not.toHaveBeenCalled()
  })

  test('only stores the preference when no audience is configured', async () => {
    const memory = memoryStore()
    const service = createProductUpdatesService({
      store: memory.store,
      audience: null,
      now: () => now,
    })

    await service.setPreference(user, true)

    expect(memory.row?.productUpdates).toBe(true)
    await expect(service.getPreference(user)).resolves.toEqual({
      enabled: true,
      consentedAt: now,
    })
  })

  test('an unsubscribe in Resend turns the preference off and is never undone', async () => {
    const memory = memoryStore({
      productUpdates: true,
      consentedAt: earlier,
      withdrawnAt: null,
    })
    const audience = fakeAudience(false)
    const service = createProductUpdatesService({
      store: memory.store,
      audience,
      now: () => now,
    })

    await expect(service.getPreference(user)).resolves.toEqual({
      enabled: false,
      consentedAt: earlier,
    })
    expect(memory.row).toEqual({
      productUpdates: false,
      consentedAt: earlier,
      withdrawnAt: now,
    })
    expect(audience.subscribe).not.toHaveBeenCalled()
  })

  test('shows the stored preference when Resend cannot be reached', async () => {
    const memory = memoryStore({
      productUpdates: true,
      consentedAt: earlier,
      withdrawnAt: null,
    })
    const audience = fakeAudience()
    audience.isSubscribed.mockRejectedValueOnce(new Error('network'))
    const service = createProductUpdatesService({
      store: memory.store,
      audience,
      now: () => now,
    })

    await expect(service.getPreference(user)).resolves.toEqual({
      enabled: true,
      consentedAt: earlier,
    })
    expect(memory.store.save).not.toHaveBeenCalled()
  })
})
