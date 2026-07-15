import { describe, expect, it } from 'vitest'

import { formatInr, formatShortDate } from './format-inr.ts'

describe('formatInr', () => {
  it('formats rupee amounts for Indian locale', () => {
    expect(formatInr('1234.5')).toMatch(/1,234/)
    expect(formatInr('1234.5')).toMatch(/₹|INR/)
  })
})

describe('formatShortDate', () => {
  it('formats ISO dates for list rows', () => {
    expect(formatShortDate('2026-07-15')).toMatch(/15/)
  })
})
