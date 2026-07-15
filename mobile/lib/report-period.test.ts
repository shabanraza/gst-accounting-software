import { describe, expect, it } from 'vitest'

import { currentMonthPeriod } from './report-period.ts'

describe('currentMonthPeriod', () => {
  it('returns the full calendar month for a date', () => {
    expect(currentMonthPeriod(new Date('2026-03-15T12:00:00'))).toEqual({
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
    })
  })
})
