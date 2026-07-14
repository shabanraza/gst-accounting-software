import { describe, expect, test } from 'vitest'

import {
  mapBusyItemRow,
  mapBusyPartyRow,
  parseBusyExport,
} from '#/features/imports/busy-format-parser.ts'

describe('mapBusyPartyRow', () => {
  test('maps BUSY account master CSV columns', () => {
    const row = mapBusyPartyRow({
      'Account Name': 'Shree Traders',
      'GST No.': '27AAAAA0000A1Z5',
      State: 'Maharashtra',
      'Account Type': 'Sundry Debtor',
    })

    expect(row).toEqual({
      name: 'Shree Traders',
      partyType: 'customer',
      gstin: '27AAAAA0000A1Z5',
      stateCode: '27',
    })
  })

  test('maps supplier groups from BUSY export', () => {
    const row = mapBusyPartyRow({
      'Party Name': 'Mill Supplies',
      GSTIN: '24BBBBB0000B1Z5',
      'State Code': '24',
      Group: 'Sundry Creditor',
    })

    expect(row.partyType).toBe('supplier')
    expect(row.stateCode).toBe('24')
  })
})

describe('mapBusyItemRow', () => {
  test('maps BUSY item master TSV columns', () => {
    const row = mapBusyItemRow({
      'Item Name': 'Cotton Fabric',
      'HSN/SAC': '5208',
      'Sale Rate': '120.00',
      Unit: 'Meter',
    })

    expect(row).toEqual({
      name: 'Cotton Fabric',
      hsn: '5208',
      rate: '120.00',
      unit: 'Meter',
    })
  })
})

describe('parseBusyExport', () => {
  test('parses tab-separated BUSY party export', () => {
    const tsv = `Account Name\tGST No.\tState\tAccount Type
Shree Traders\t27AAAAA0000A1Z5\tMaharashtra\tCustomer
Mill Supplies\t24BBBBB0000B1Z5\tGujarat\tSupplier`

    const rows = parseBusyExport(tsv, 'parties')

    expect(rows).toHaveLength(2)
    expect(rows[0]?.partyType).toBe('customer')
    expect(rows[1]?.partyType).toBe('supplier')
  })
})
