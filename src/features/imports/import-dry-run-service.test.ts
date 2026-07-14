import { describe, expect, test } from 'vitest'

import {
  dryRunImportOpeningStock,
  dryRunImportParties,
} from '#/features/imports/import-dry-run-service.ts'
import type {
  ImportPartyRow,
  ImportStockRow,
} from '#/features/imports/import-dry-run-service.ts'

describe('dryRunImportParties', () => {
  test('returns row errors without writing data', () => {
    const rows: Array<ImportPartyRow> = [
      {
        name: 'Noor Retailers',
        partyType: 'customer',
        gstin: '27AABCU9603R1ZM',
        stateCode: '27',
      },
      {
        name: '',
        partyType: 'supplier',
        gstin: 'BAD',
        stateCode: '2',
      },
    ]

    const result = dryRunImportParties(rows)

    expect(result.validCount).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.rowNumber).toBe(2)
    expect(result.wroteData).toBe(false)
  })
})

describe('dryRunImportOpeningStock', () => {
  test('validates opening stock import rows without writing', () => {
    const rows: Array<ImportStockRow> = [
      {
        itemName: 'Cotton Fabric',
        quantity: '100',
        unit: 'meter',
        rate: '80.00',
      },
      {
        itemName: 'Silk',
        quantity: '-5',
        unit: '',
        rate: 'abc',
      },
    ]

    const result = dryRunImportOpeningStock(rows)

    expect(result.validCount).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.messages.length).toBeGreaterThan(0)
    expect(result.wroteData).toBe(false)
  })
})
