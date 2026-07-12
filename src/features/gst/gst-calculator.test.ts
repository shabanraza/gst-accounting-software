import { describe, expect, test } from 'vitest'

import { calculateGst } from '#/features/gst/gst-calculator.ts'

describe('calculateGst', () => {
  test('splits same-state GST into CGST and SGST', () => {
    const result = calculateGst({
      taxableAmount: '2400.00',
      gstRate: '5.00',
      companyStateCode: '27',
      partyStateCode: '27',
    })

    expect(result.taxableAmount).toBe('2400.00')
    expect(result.cgstAmount).toBe('60.00')
    expect(result.sgstAmount).toBe('60.00')
    expect(result.igstAmount).toBe('0.00')
    expect(result.totalGstAmount).toBe('120.00')
    expect(result.totalAmount).toBe('2520.00')
    expect(result.supplyType).toBe('intra_state')
  })

  test('applies IGST for interstate GST', () => {
    const result = calculateGst({
      taxableAmount: '8000.00',
      gstRate: '5.00',
      companyStateCode: '27',
      partyStateCode: '24',
    })

    expect(result.cgstAmount).toBe('0.00')
    expect(result.sgstAmount).toBe('0.00')
    expect(result.igstAmount).toBe('400.00')
    expect(result.totalGstAmount).toBe('400.00')
    expect(result.totalAmount).toBe('8400.00')
    expect(result.supplyType).toBe('inter_state')
  })

  test('rounds GST amounts to 2 decimals using half-up', () => {
    const result = calculateGst({
      taxableAmount: '100.00',
      gstRate: '18.00',
      companyStateCode: '27',
      partyStateCode: '27',
    })

    expect(result.cgstAmount).toBe('9.00')
    expect(result.sgstAmount).toBe('9.00')
    expect(result.totalGstAmount).toBe('18.00')
    expect(result.totalAmount).toBe('118.00')
  })
})
