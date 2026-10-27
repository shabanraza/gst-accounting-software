import { drizzle } from 'drizzle-orm/pg-proxy'
import { describe, expect, test } from 'vitest'

import * as schema from '#/db/schema.ts'
import { DrizzleDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'

describe('DrizzleDocumentSequenceRepository', () => {
  test('allocates with a single atomic increment-and-return statement', async () => {
    const queries: Array<string> = []
    const database = drizzle(
      async (query) => {
        queries.push(query)
        return { rows: [[5]] }
      },
      { schema },
    )
    const repository = new DrizzleDocumentSequenceRepository(database)

    const allocated = await repository.allocateNext({
      companyId: crypto.randomUUID(),
      financialYearId: crypto.randomUUID(),
      voucherType: 'sales_invoice',
      series: 'INV',
    })

    expect(allocated).toBe(4)
    expect(queries).toHaveLength(1)
    expect(queries[0]).toMatch(/^insert into "document_sequences"/)
    expect(queries[0]).toContain(
      'on conflict ("company_id","financial_year_id","voucher_type","series") do update',
    )
    expect(queries[0]).toContain(
      '"next_number" = "document_sequences"."next_number" + 1',
    )
    expect(queries[0]).toContain('returning "next_number"')
  })
})
