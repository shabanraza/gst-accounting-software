import { describe, expect, test } from 'vitest'

import {
  calculateGst,
  splitIntraStateGst,
} from '#/features/gst/gst-calculator.ts'

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

describe('intra-state CGST and SGST are always equal (IRP error 2227)', () => {
  test.each([
    // taxable, rate, expected half, expected total
    ['100.00', '0.25', '0.13', '0.26'],
    ['10.10', '5.00', '0.25', '0.50'],
    ['33.33', '3.00', '0.50', '1.00'],
    ['999.99', '18.00', '90.00', '180.00'],
  ])('%s at %s%%', (taxableAmount, gstRate, half, total) => {
    const result = calculateGst({
      taxableAmount,
      gstRate,
      companyStateCode: '27',
      partyStateCode: '27',
    })
    expect(result.cgstAmount).toBe(half)
    expect(result.sgstAmount).toBe(half)
    expect(result.totalGstAmount).toBe(total)
    expect(result.totalAmount).toBe(
      (Number(taxableAmount) + Number(total)).toFixed(2),
    )
  })

  test('inter-state IGST is unchanged: rounded once on the full rate', () => {
    const result = calculateGst({
      taxableAmount: '10.10',
      gstRate: '5.00',
      companyStateCode: '27',
      partyStateCode: '29',
    })
    expect(result.igstAmount).toBe('0.51')
    expect(result.totalGstAmount).toBe('0.51')
  })
})

describe('splitIntraStateGst', () => {
  test('splits an even total into equal halves', () => {
    expect(splitIntraStateGst('0.26')).toEqual({ cgst: '0.13', sgst: '0.13' })
  })

  test('keeps an odd stored total whole: CGST + SGST = total', () => {
    expect(splitIntraStateGst('0.25')).toEqual({ cgst: '0.13', sgst: '0.12' })
    expect(splitIntraStateGst('180.01')).toEqual({
      cgst: '90.01',
      sgst: '90.00',
    })
  })
})
