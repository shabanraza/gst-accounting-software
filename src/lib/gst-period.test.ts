import { describe, expect, test } from 'vitest'

import {
  currentFinancialYearStart,
  monthlyGstFilingDates,
} from '#/lib/gst-period.ts'

describe('currentFinancialYearStart', () => {
  test('April onwards belongs to the financial year starting that April', () => {
    expect(currentFinancialYearStart(new Date(2027, 3, 1))).toBe('2027-04-01')
    expect(currentFinancialYearStart(new Date(2026, 9, 27))).toBe('2026-04-01')
  })

  test('January to March belongs to the previous April', () => {
    expect(currentFinancialYearStart(new Date(2027, 2, 31))).toBe('2026-04-01')
  })
})

describe('monthlyGstFilingDates', () => {
  test('GSTR-1 on the 11th and GSTR-3B on the 20th of the next month', () => {
    expect(monthlyGstFilingDates('2026-10-29')).toEqual({
      gstr1: '2026-11-11',
      gstr3b: '2026-11-20',
    })
  })

  test('December returns rolls into January of the next year', () => {
    expect(monthlyGstFilingDates('2026-12-05')).toEqual({
      gstr1: '2027-01-11',
      gstr3b: '2027-01-20',
    })
  })
})
