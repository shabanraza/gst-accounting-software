import { describe, expect, test } from 'vitest'

import {
  checkEInvoice,
  checkEWayBill,
} from '#/features/tools/e-invoice-applicability-service.ts'

describe('checkEInvoice', () => {
  test('is not required at or below ₹5 crore', () => {
    expect(checkEInvoice({ highestAatoCrore: '5', exemptCategory: 'none' })).toEqual({
      status: 'not-required',
      reportingWindowDays: null,
    })
  })

  test('is required above ₹5 crore with no reporting cap below ₹10 crore', () => {
    expect(checkEInvoice({ highestAatoCrore: '7.5', exemptCategory: 'none' })).toEqual({
      status: 'required',
      reportingWindowDays: null,
    })
  })

  test('adds the 30-day reporting window at ₹10 crore and above', () => {
    expect(checkEInvoice({ highestAatoCrore: '10', exemptCategory: 'none' })).toEqual({
      status: 'required',
      reportingWindowDays: 30,
    })
  })

  test('exempt categories never need it, whatever the turnover', () => {
    expect(
      checkEInvoice({ highestAatoCrore: '500', exemptCategory: 'sez-unit' }).status,
    ).toBe('exempt')
  })

  test('returns invalid for unusable turnover', () => {
    expect(checkEInvoice({ highestAatoCrore: 'abc', exemptCategory: 'none' }).status).toBe(
      'invalid',
    )
  })
})

describe('checkEWayBill', () => {
  test('is required above ₹50,000 for inter-state movement', () => {
    expect(
      checkEWayBill({ consignmentValue: '50001', interState: true, specialCase: false }),
    ).toBe('required')
  })

  test('defers to the state rule above ₹50,000 within a state', () => {
    expect(
      checkEWayBill({ consignmentValue: '75000', interState: false, specialCase: false }),
    ).toBe('check-state-limit')
  })

  test('is not required at or below ₹50,000 unless it is job work or handicraft', () => {
    expect(
      checkEWayBill({ consignmentValue: '50000', interState: true, specialCase: false }),
    ).toBe('not-required')
    expect(
      checkEWayBill({ consignmentValue: '10000', interState: true, specialCase: true }),
    ).toBe('required')
  })
})
