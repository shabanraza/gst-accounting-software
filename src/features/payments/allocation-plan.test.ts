import { describe, expect, test } from 'vitest'

import {
  allocateOldestFirst,
  summariseAllocation,
} from '#/features/payments/allocation-plan.ts'

const docs = [
  { id: 'b', date: '2026-05-10', outstanding: '500.00' },
  { id: 'a', date: '2026-05-01', outstanding: '300.00' },
  { id: 'c', date: '2026-06-01', outstanding: '400.00' },
]

describe('allocateOldestFirst', () => {
  test('fills the oldest bills first and part-pays the last one', () => {
    expect(allocateOldestFirst('1000', docs)).toEqual({
      a: '300.00',
      b: '500.00',
      c: '200.00',
    })
  })

  test('leaves nothing allocated for a zero or invalid amount', () => {
    expect(allocateOldestFirst('0', docs)).toEqual({})
    expect(allocateOldestFirst('abc', docs)).toEqual({})
  })

  test('stops when every bill is cleared', () => {
    expect(allocateOldestFirst('5000', docs)).toEqual({
      a: '300.00',
      b: '500.00',
      c: '400.00',
    })
  })
})

describe('summariseAllocation', () => {
  test('reports the allocated total and the advance left over', () => {
    expect(
      summariseAllocation('1000', { a: '300', b: '200.50', c: '' }),
    ).toEqual({ allocated: '500.50', advance: '499.50', overAllocated: false })
  })

  test('flags allocations above the amount', () => {
    expect(summariseAllocation('100', { a: '300' })).toEqual({
      allocated: '300.00',
      advance: '0.00',
      overAllocated: true,
    })
  })
})
