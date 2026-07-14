import { describe, expect, test } from 'vitest'

import {
  amountInWords,
  formatIndianDate,
  isInterStateSupply,
  splitLineGst,
  stateLabel,
} from '#/features/documents/gst-invoice-format.ts'

describe('amountInWords', () => {
  test('formats rupees and paise in the Indian system', () => {
    expect(amountInWords('2520.00')).toBe(
      'Two Thousand Five Hundred Twenty Rupees Only',
    )
    expect(amountInWords('105.50')).toBe(
      'One Hundred Five Rupees and Fifty Paise Only',
    )
    expect(amountInWords('12500000.00')).toBe(
      'One Crore Twenty Five Lakh Rupees Only',
    )
    expect(amountInWords('0')).toBe('Zero Rupees Only')
  })
})

describe('splitLineGst', () => {
  test('splits into CGST + SGST for intra-state supply', () => {
    const split = splitLineGst({ gstRate: '5.00', gstAmount: '120.00' }, false)
    expect(split.cgstRate).toBe('2.50')
    expect(split.cgstAmount).toBe('60.00')
    expect(split.sgstAmount).toBe('60.00')
    expect(split.igstAmount).toBe('0.00')
  })

  test('assigns full amount to IGST for inter-state supply', () => {
    const split = splitLineGst({ gstRate: '18.00', gstAmount: '180.00' }, true)
    expect(split.igstRate).toBe('18.00')
    expect(split.igstAmount).toBe('180.00')
    expect(split.cgstAmount).toBe('0.00')
  })
})

describe('isInterStateSupply', () => {
  test('is intra-state when supplier and place match', () => {
    expect(isInterStateSupply('27', '27')).toBe(false)
  })
  test('is inter-state when they differ', () => {
    expect(isInterStateSupply('27', '24')).toBe(true)
  })
})

describe('stateLabel', () => {
  test('renders code and name', () => {
    expect(stateLabel('27')).toBe('27 - Maharashtra')
  })
})

describe('formatIndianDate', () => {
  test('formats ISO dates as DD-MM-YYYY', () => {
    expect(formatIndianDate('2026-07-14')).toBe('14-07-2026')
    expect(formatIndianDate('2026-07-14T10:30:00.000Z')).toBe('14-07-2026')
  })

  test('returns empty string for missing values', () => {
    expect(formatIndianDate(null)).toBe('')
    expect(formatIndianDate('')).toBe('')
  })
})
