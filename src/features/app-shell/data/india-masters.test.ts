import { describe, expect, test } from 'vitest'

import {
  formatGstRateLabel,
  gstRateOptions,
} from '#/features/app-shell/data/india-masters.ts'
import { calculateGst } from '#/features/gst/gst-calculator.ts'

describe('gstRateOptions', () => {
  test('offers every rate notified under GST, including GST 2.0 and special rates', () => {
    expect(gstRateOptions).toEqual([
      '0.00',
      '0.10',
      '0.25',
      '1.00',
      '1.50',
      '3.00',
      '5.00',
      '6.00',
      '7.50',
      '12.00',
      '18.00',
      '28.00',
      '40.00',
    ])
  })

  test('labels rates without trailing zeros', () => {
    expect(formatGstRateLabel('0.00')).toBe('No GST (0%)')
    expect(formatGstRateLabel('0.25')).toBe('0.25%')
    expect(formatGstRateLabel('1.50')).toBe('1.5%')
    expect(formatGstRateLabel('40.00')).toBe('40%')
  })
})

describe('calculateGst with special and new rates', () => {
  test('40% inter-state', () => {
    const gst = calculateGst({
      taxableAmount: '1000.00',
      gstRate: '40.00',
      companyStateCode: '27',
      partyStateCode: '29',
    })
    expect(gst.igstAmount).toBe('400.00')
    expect(gst.totalAmount).toBe('1400.00')
  })

  test('3% on gold, intra-state, split into 1.5% CGST and 1.5% SGST', () => {
    const gst = calculateGst({
      taxableAmount: '50000.00',
      gstRate: '3.00',
      companyStateCode: '27',
      partyStateCode: '27',
    })
    expect(gst.cgstAmount).toBe('750.00')
    expect(gst.sgstAmount).toBe('750.00')
    expect(gst.totalGstAmount).toBe('1500.00')
  })

  test('0.25% keeps its precision', () => {
    const gst = calculateGst({
      taxableAmount: '100000.00',
      gstRate: '0.25',
      companyStateCode: '27',
      partyStateCode: '29',
    })
    expect(gst.gstRate).toBe('0.25')
    expect(gst.igstAmount).toBe('250.00')
  })
})
