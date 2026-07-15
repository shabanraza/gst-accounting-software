import { describe, expect, it } from 'vitest'

import { validatePaymentAmount, hasOutstandingBalance } from './payment-allocation.ts'

describe('validatePaymentAmount', () => {
  it('rejects empty or excessive amounts', () => {
    expect(validatePaymentAmount('', '100.00')).toBe('Enter a positive amount.')
    expect(validatePaymentAmount('0', '100.00')).toBe('Enter a positive amount.')
    expect(validatePaymentAmount('150', '100.00')).toBe(
      'Amount cannot exceed outstanding balance.',
    )
  })

  it('accepts valid amounts', () => {
    expect(validatePaymentAmount('50', '100.00')).toBeNull()
    expect(validatePaymentAmount('100', '100.00')).toBeNull()
    expect(validatePaymentAmount('100.00', '100.00')).toBeNull()
  })

  it('compares decimal amounts safely', () => {
    expect(validatePaymentAmount('100.01', '100.00')).toBe(
      'Amount cannot exceed outstanding balance.',
    )
    expect(validatePaymentAmount('99.99', '100.00')).toBeNull()
  })

  it('detects outstanding balance', () => {
    expect(hasOutstandingBalance('10.00')).toBe(true)
    expect(hasOutstandingBalance('0.00')).toBe(false)
    expect(hasOutstandingBalance('0.001')).toBe(false)
  })
})
