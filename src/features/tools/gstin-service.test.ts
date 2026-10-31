import { describe, expect, test } from 'vitest'

import { gstinCheckDigit, validateGstin } from '#/features/tools/gstin-service.ts'

describe('validateGstin', () => {
  test('decodes a valid GSTIN', () => {
    expect(validateGstin(' 27aapfu0939f1zv ')).toEqual({
      valid: true,
      gstin: '27AAPFU0939F1ZV',
      stateCode: '27',
      stateName: 'Maharashtra',
      pan: 'AAPFU0939F',
      entityType: 'Firm / LLP',
      registrationNumber: '1',
    })
  })

  test('rejects a GSTIN whose check digit does not match', () => {
    expect(validateGstin('07AAACI1681G1ZN')).toEqual({
      valid: false,
      reason: 'checksum',
      expectedCheckDigit: 'R',
    })
  })

  test('rejects wrong length and bad structure', () => {
    expect(validateGstin('27AAPFU0939F1Z')).toMatchObject({
      valid: false,
      reason: 'length',
    })
    expect(validateGstin('27AAPF00939F1ZV')).toMatchObject({
      valid: false,
      reason: 'format',
    })
  })

  test('rejects a state code that GST does not use', () => {
    expect(validateGstin('40AAPFU0939F1ZV')).toMatchObject({
      valid: false,
      reason: 'state',
    })
  })

  test('computes the check digit from the first 14 characters', () => {
    expect(gstinCheckDigit('29AAGCB7383J1Z')).toBe('4')
  })
})
