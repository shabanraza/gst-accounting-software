import { describe, expect, test } from 'vitest'

import { formatInr } from '#/lib/format-inr.ts'

describe('formatInr', () => {
  test('formats rupees with Indian digit grouping', () => {
    expect(formatInr('1234567.5')).toBe('₹12,34,567.50')
  })

  test.each(['-0', '-0.00', -0, '-0.001'])(
    'never shows negative zero for %j',
    (value) => {
      expect(formatInr(value)).toBe('₹0.00')
    },
  )

  test('keeps real negative amounts', () => {
    expect(formatInr('-250')).toBe('₹-250.00')
  })
})
