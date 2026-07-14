import { describe, expect, test } from 'vitest'

import {
  percentChange,
  previousMonthComparablePeriod,
} from '#/features/dashboard/dashboard-owner-service.ts'

describe('dashboard month compare helpers', () => {
  test('previous month period uses same day count', () => {
    expect(previousMonthComparablePeriod('2026-03-31')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    })
    expect(previousMonthComparablePeriod('2026-07-14')).toEqual({
      start: '2026-06-01',
      end: '2026-06-14',
    })
  })

  test('percent change handles zero and growth', () => {
    expect(percentChange('120.00', '100.00')).toBe('20.0')
    expect(percentChange('0.00', '0.00')).toBe('0.0')
    expect(percentChange('50.00', '0.00')).toBe('100.0')
  })
})
