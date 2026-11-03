import { describe, expect, test } from 'vitest'

import {
  addScannedItem,
  computeVoucherLine,
  computeVoucherTotals,
  emptyVoucherLine,
  createEmptyVoucherLines,
  isValidStateCode,
  partyStateForRegion,
  resolvePlaceOfSupply,
  resolveStateCode,
} from '#/features/accounting/voucher-math.ts'

describe('voucher math', () => {
  test('computes exclusive tax after item discount', () => {
    const line = computeVoucherLine(
      {
        ...emptyVoucherLine(),
        quantity: '10',
        rate: '100.00',
        discountPercent: '10',
        gstRate: '18.00',
      },
      'local',
      '27',
      'exclusive',
      '27',
    )

    expect(line.grossAmount).toBe('1000.00')
    expect(line.discountAmount).toBe('100.00')
    expect(line.taxableAmount).toBe('900.00')
    expect(line.cgstAmount).toBe('81.00')
    expect(line.sgstAmount).toBe('81.00')
    expect(line.lineTotal).toBe('1062.00')
  })

  test('back-calculates taxable from tax-inclusive rate', () => {
    const line = computeVoucherLine(
      {
        ...emptyVoucherLine(),
        quantity: '1',
        rate: '118.00',
        discountPercent: '0',
        gstRate: '18.00',
      },
      'central',
      '24',
      'inclusive',
      '27',
    )

    expect(line.taxableAmount).toBe('100.00')
    expect(line.igstAmount).toBe('18.00')
    expect(line.lineTotal).toBe('118.00')
  })

  test('adds bill-level discount into totals', () => {
    const line = computeVoucherLine(
      {
        ...emptyVoucherLine(),
        quantity: '1',
        rate: '100.00',
        gstRate: '0.00',
      },
      'local',
      '27',
      'exclusive',
      '27',
    )

    const totals = computeVoucherTotals([line], {
      freight: '20.00',
      packing: '0.00',
      roundOff: '0.00',
      billDiscount: '10.00',
    })

    expect(totals.sundryTotal).toBe('10.00')
    expect(totals.grandTotal).toBe('110.00')
  })

  test('creates a spreadsheet of empty rows', () => {
    const rows = createEmptyVoucherLines(5)
    expect(rows).toHaveLength(5)
    expect(rows.every((row) => row.itemId === '')).toBe(true)
  })

  test('resolves place of supply for local supply from company state', () => {
    expect(
      resolvePlaceOfSupply({
        region: 'local',
        selectedPlaceOfSupply: '',
        partyStateCode: '24',
        companyStateCode: '27',
      }),
    ).toBe('27')
  })

  test('falls back to party state when place of supply is empty for IGST', () => {
    expect(
      resolvePlaceOfSupply({
        region: 'central',
        selectedPlaceOfSupply: '',
        partyStateCode: '24',
        companyStateCode: '27',
      }),
    ).toBe('24')
  })

  test('does not invent a state when the company state is missing', () => {
    expect(
      resolvePlaceOfSupply({
        region: 'local',
        selectedPlaceOfSupply: '',
        partyStateCode: '',
        companyStateCode: '',
      }),
    ).toBe('')
  })

  test('does not substitute a fake state for inter-state supply to the home state', () => {
    expect(partyStateForRegion('central', '27', '27')).toBe('')
    expect(partyStateForRegion('central', '24', '27')).toBe('24')
    expect(partyStateForRegion('local', '24', '27')).toBe('27')
  })

  test('resolveStateCode picks the first valid two-digit code', () => {
    expect(resolveStateCode('', '2', '27')).toBe('27')
    expect(isValidStateCode('27')).toBe(true)
    expect(isValidStateCode('')).toBe(false)
  })
})

describe('addScannedItem', () => {
  const scanned = {
    itemId: 'item-1',
    itemName: 'Biscuits',
    hsnCode: '1905',
    gstRate: '18.00',
    unit: 'Nos',
    uqc: 'NOS',
    rate: '10.00',
    godownName: 'Main',
  }

  test('fills the first empty line with one of the scanned item', () => {
    const lines = createEmptyVoucherLines(1, 'Main')

    const next = addScannedItem(lines, scanned)

    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ ...scanned, quantity: '1' })
    expect(next[0]?.key).toBe(lines[0]?.key)
  })

  test('adds one to the quantity when the item is already on the bill', () => {
    const lines = addScannedItem(createEmptyVoucherLines(1, 'Main'), scanned)

    const next = addScannedItem(addScannedItem(lines, scanned), scanned)

    expect(next).toHaveLength(1)
    expect(next[0]?.quantity).toBe('3')
  })

  test('adds a new line for a different item', () => {
    const lines = addScannedItem(createEmptyVoucherLines(1, 'Main'), scanned)

    const next = addScannedItem(lines, {
      ...scanned,
      itemId: 'item-2',
      itemName: 'Tea',
    })

    expect(next.map((line) => [line.itemId, line.quantity])).toEqual([
      ['item-1', '1'],
      ['item-2', '1'],
    ])
  })

  test('keeps a line with a different unit separate', () => {
    const lines = addScannedItem(createEmptyVoucherLines(1, 'Main'), {
      ...scanned,
      unit: 'Box',
    })

    const next = addScannedItem(lines, scanned)

    expect(next.map((line) => [line.unit, line.quantity])).toEqual([
      ['Box', '1'],
      ['Nos', '1'],
    ])
  })
})
