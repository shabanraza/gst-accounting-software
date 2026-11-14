import { drizzle } from 'drizzle-orm/pg-proxy'
import { describe, expect, test } from 'vitest'

import * as schema from '#/db/schema.ts'
import { DrizzleSalesAnalysisRepository } from '#/features/reports-analysis/sales-analysis-store.ts'

function recordingDatabase() {
  const queries: Array<{ sql: string; params: Array<unknown> }> = []
  const database = drizzle(
    async (sql, params) => {
      queries.push({ sql, params })
      return { rows: [] }
    },
    { schema },
  )
  return { database, queries }
}

describe('DrizzleSalesAnalysisRepository', () => {
  test('every query is scoped to the company and the period', async () => {
    const { database, queries } = recordingDatabase()
    const companyId = crypto.randomUUID()

    const data = await new DrizzleSalesAnalysisRepository(database).loadPeriod({
      companyId,
      from: '2026-11-01',
      to: '2026-11-30',
    })

    expect(data.invoices).toEqual([])
    expect(queries).toHaveLength(5)
    for (const query of queries) {
      expect(query.sql).toMatch(/"company_id" = \$/)
      expect(query.params).toContain(companyId)
      expect(query.params).toContain('2026-11-01')
      expect(query.params).toContain('2026-11-30')
    }
    expect(queries[0].sql).toMatch(/"status" <> \$/)
  })
})
