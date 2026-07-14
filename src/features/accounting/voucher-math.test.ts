import { describe, expect, test } from 'vitest'

import {
  computeVoucherLine,
  computeVoucherTotals,
  emptyVoucherLine,
  createEmptyVoucherLines,
  isValidStateCode,
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

  test('resolveStateCode picks the first valid two-digit code', () => {
    expect(resolveStateCode('', '2', '27')).toBe('27')
    expect(isValidStateCode('27')).toBe(true)
    expect(isValidStateCode('')).toBe(false)
  })
})
