import { describe, expect, test } from 'vitest'

import { currentFinancialYearStart } from '#/lib/gst-period.ts'

describe('currentFinancialYearStart', () => {
  test('April onwards belongs to the financial year starting that April', () => {
    expect(currentFinancialYearStart(new Date(2027, 3, 1))).toBe('2027-04-01')
    expect(currentFinancialYearStart(new Date(2026, 9, 27))).toBe('2026-04-01')
  })

  test('January to March belongs to the previous April', () => {
    expect(currentFinancialYearStart(new Date(2027, 2, 31))).toBe('2026-04-01')
  })
})
