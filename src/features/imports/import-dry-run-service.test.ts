import { describe, expect, test } from 'vitest'

import {
  dryRunImportItems,
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

describe('dryRunImportItems', () => {
  test('accepts 4, 6 and 8 digit HSN codes and a GST rate', () => {
    const result = dryRunImportItems([
      { name: 'Yarn', hsn: '5205', rate: '120.00', unit: 'Kg' },
      { name: 'Fabric', hsn: '520812', rate: '80.00', unit: 'Mtr', gstRate: '5' },
      { name: 'Thread', hsn: '52041100', rate: '10.00', unit: 'Box', gstRate: '18.00' },
    ])

    expect(result.errors).toEqual([])
    expect(result.validCount).toBe(3)
  })

  test('rejects a 5 digit HSN and a GST rate that is not a percentage', () => {
    const result = dryRunImportItems([
      { name: 'Yarn', hsn: '52051', rate: '120.00', unit: 'Kg', gstRate: 'abc' },
    ])

    expect(result.errors[0]?.messages).toEqual([
      'HSN must be 4, 6 or 8 digits',
      'GST rate must be a percentage between 0 and 40',
    ])
  })
})

describe('dryRunImportItems with a missing GST rate', () => {
  test('says the rate is missing', () => {
    const result = dryRunImportItems([
      { name: 'Yarn', hsn: '5205', rate: '0.00', unit: 'Kg', gstRate: '' },
    ])

    expect(result.errors[0]?.messages).toEqual(['GST rate is missing'])
  })
})

describe('dryRunImportItems with no HSN', () => {
  test('accepts it, so the HSN can be filled in later', () => {
    const result = dryRunImportItems([
      { name: 'Ball Pen', hsn: '', rate: '0.00', unit: 'Nos', gstRate: '12' },
    ])

    expect(result.errors).toEqual([])
    expect(result.validCount).toBe(1)
  })
})
