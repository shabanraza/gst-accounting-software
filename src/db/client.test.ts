import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

describe('database configuration guard', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_URL', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('refuses to fall back to in-memory repositories in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const { getDb, openPooledDb } = await import('#/db/client.ts')

    expect(() => getDb()).toThrow('DATABASE_URL is required in production')
    expect(() => openPooledDb()).toThrow(
      'DATABASE_URL is required in production',
    )
    await expect(
      import('#/features/sales/sales-invoice-store.ts'),
    ).rejects.toThrow('DATABASE_URL is required in production')
  })

  test('uses in-memory repositories outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test')

    const { getDb, openPooledDb } = await import('#/db/client.ts')
    const { InMemorySalesInvoiceRepository, createSalesInvoiceRepository } =
      await import('#/features/sales/sales-invoice-store.ts')

    expect(getDb()).toBeNull()
    expect(openPooledDb()).toBeNull()
    expect(createSalesInvoiceRepository()).toBeInstanceOf(
      InMemorySalesInvoiceRepository,
    )
  })
})
