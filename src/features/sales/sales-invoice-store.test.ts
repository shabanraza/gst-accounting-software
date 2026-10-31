import { drizzle } from 'drizzle-orm/pg-proxy'
import { describe, expect, test } from 'vitest'

import * as schema from '#/db/schema.ts'
import { DrizzlePurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { DrizzleSalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'

function recordingDatabase() {
  const queries: Array<string> = []
  const database = drizzle(
    async (query) => {
      queries.push(query)
      return { rows: [] }
    },
    { schema },
  )
  return { database, queries }
}

describe('document row locks', () => {
  test('sales invoice lockById selects the header FOR UPDATE', async () => {
    const { database, queries } = recordingDatabase()
    await new DrizzleSalesInvoiceRepository(database).lockById(
      crypto.randomUUID(),
    )
    expect(queries[0]).toMatch(/from "sales_invoices".* for update$/)
  })

  test('purchase bill lockById selects the header FOR UPDATE', async () => {
    const { database, queries } = recordingDatabase()
    await new DrizzlePurchaseBillRepository(database).lockById(
      crypto.randomUUID(),
    )
    expect(queries[0]).toMatch(/from "purchase_bills".* for update$/)
  })
})
