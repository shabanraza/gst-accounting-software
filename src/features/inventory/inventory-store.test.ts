import { drizzle } from 'drizzle-orm/pg-proxy'
import { describe, expect, test } from 'vitest'

import * as schema from '#/db/schema.ts'
import { DrizzleStockStore } from '#/features/inventory/inventory-store.ts'

function recordingStore() {
  const queries: Array<string> = []
  const database = drizzle(
    async (query) => {
      queries.push(query)
      return { rows: [] }
    },
    { schema },
  )
  return { store: new DrizzleStockStore(database), queries }
}

describe('DrizzleStockStore', () => {
  test('locks the balance row it reads, so concurrent sales cannot lose an update', async () => {
    const { store, queries } = recordingStore()
    await store.getBalance(crypto.randomUUID(), crypto.randomUUID())

    expect(queries).toHaveLength(1)
    expect(queries[0]).toMatch(/from "stock_balances".* for update$/)
  })

  test('writes the balance with a single upsert', async () => {
    const { store, queries } = recordingStore()
    await store.setBalance(
      crypto.randomUUID(),
      crypto.randomUUID(),
      '7',
      '700.00',
    )

    expect(queries).toHaveLength(1)
    expect(queries[0]).toMatch(/^insert into "stock_balances"/)
    expect(queries[0]).toContain(
      'on conflict ("company_id","item_id") do update',
    )
    expect(queries[0]).toMatch(/do update set .*"value" = /)
  })

  test('locks every balance of a document in one query', async () => {
    const { store, queries } = recordingStore()
    await store.getBalances(crypto.randomUUID(), [
      crypto.randomUUID(),
      crypto.randomUUID(),
    ])

    expect(queries).toHaveLength(1)
    expect(queries[0]).toMatch(/"item_id" in \(\$2, \$3\).* for update$/)
  })

  test('inserts all movements of a document in one statement', async () => {
    const { store, queries } = recordingStore()
    const movement = {
      id: crypto.randomUUID(),
      companyId: crypto.randomUUID(),
      itemId: crypto.randomUUID(),
      movementType: 'sale_out' as const,
      direction: 'out' as const,
      quantity: '1',
      unit: 'meter',
      referenceType: 'sales_invoice',
      referenceId: crypto.randomUUID(),
      occurredOn: '2026-07-11',
      godownName: null,
      value: '80.00',
      createdAt: new Date(),
    }
    await store.createMovements([
      movement,
      { ...movement, id: crypto.randomUUID() },
    ])

    expect(queries).toHaveLength(1)
    expect(queries[0]).toMatch(
      /^insert into "stock_movements" .* values \(.*\), \(.*\)/,
    )
  })

  test('writes quantity and value of every balance with one upsert', async () => {
    const { store, queries } = recordingStore()
    await store.setBalances(crypto.randomUUID(), [
      { itemId: crypto.randomUUID(), quantity: '3', value: '240.00' },
      { itemId: crypto.randomUUID(), quantity: '4', value: '320.00' },
    ])

    expect(queries).toHaveLength(1)
    expect(queries[0]).toContain(
      'on conflict ("company_id","item_id") do update set "quantity" = excluded.quantity, "value" = excluded.value',
    )
  })
})
