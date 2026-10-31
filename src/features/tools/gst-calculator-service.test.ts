import { describe, expect, test } from 'vitest'

import {
  GST_RATE_PAGES,
  calculateGst,
  getRatePage,
} from '#/features/tools/gst-calculator-service.ts'

describe('calculateGst', () => {
  test('adds GST on top of an exclusive amount and splits CGST/SGST intra-state', () => {
    expect(
      calculateGst({ amount: '1000', rate: '18', mode: 'exclusive', interState: false }),
    ).toEqual({
      taxableValue: '1000.00',
      gstAmount: '180.00',
      total: '1180.00',
      cgst: '90.00',
      sgst: '90.00',
      igst: '0.00',
    })
  })

  test('removes GST from an inclusive amount', () => {
    expect(
      calculateGst({ amount: '1180', rate: '18', mode: 'inclusive', interState: false }),
    ).toMatchObject({ taxableValue: '1000.00', gstAmount: '180.00', total: '1180.00' })
  })

  test('puts the whole tax in IGST for inter-state supply', () => {
    expect(
      calculateGst({ amount: '200', rate: '5', mode: 'exclusive', interState: true }),
    ).toMatchObject({ gstAmount: '10.00', cgst: '0.00', sgst: '0.00', igst: '10.00' })
  })

  test('keeps CGST + SGST equal to the total when the half has an odd paisa', () => {
    const result = calculateGst({
      amount: '100.10',
      rate: '5',
      mode: 'exclusive',
      interState: false,
    })
    expect(result?.gstAmount).toBe('5.01')
    expect(result?.cgst).toBe('2.51')
    expect(result?.sgst).toBe('2.50')
  })

  test('handles fractional slabs like 0.25% and 3%', () => {
    expect(
      calculateGst({ amount: '10000', rate: '0.25', mode: 'exclusive', interState: true })
        ?.igst,
    ).toBe('25.00')
    expect(
      calculateGst({ amount: '50000', rate: '3', mode: 'exclusive', interState: true })
        ?.total,
    ).toBe('51500.00')
  })

  test('returns null for blank, negative, or non-numeric input', () => {
    for (const amount of ['', '-5', 'abc']) {
      expect(
        calculateGst({ amount, rate: '18', mode: 'exclusive', interState: false }),
      ).toBeNull()
    }
    expect(
      calculateGst({ amount: '100', rate: '101', mode: 'exclusive', interState: false }),
    ).toBeNull()
  })
})

describe('rate pages', () => {
  test('every rate page has a unique slug that resolves back to itself', () => {
    const slugs = new Set(GST_RATE_PAGES.map((page) => page.slug))
    expect(slugs.size).toBe(GST_RATE_PAGES.length)
    for (const page of GST_RATE_PAGES) {
      expect(getRatePage(page.slug)).toBe(page)
    }
    expect(getRatePage('12-percent-old')).toBeUndefined()
  })
})
