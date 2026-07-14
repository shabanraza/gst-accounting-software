import { describe, expect, test } from 'vitest'

import {
  isValidGstin,
  isValidHsnCode,
  stateCodeFromGstin,
} from '#/features/gst/gst-validation.ts'

describe('isValidGstin', () => {
  test('accepts a well-formed GSTIN', () => {
    expect(isValidGstin('27AABCU9603R1ZM')).toBe(true)
  })

  test('rejects an invalid GSTIN', () => {
    expect(isValidGstin('not-a-gstin')).toBe(false)
    expect(isValidGstin('27AABCU9603R1Z')).toBe(false)
  })

  test('is case-insensitive', () => {
    expect(isValidGstin('27aabcu9603r1zm')).toBe(true)
  })
})

describe('isValidHsnCode', () => {
  test('accepts 4, 6, and 8 digit codes', () => {
    expect(isValidHsnCode('5208')).toBe(true)
    expect(isValidHsnCode('520811')).toBe(true)
    expect(isValidHsnCode('52081100')).toBe(true)
  })

  test('rejects malformed codes', () => {
    expect(isValidHsnCode('520')).toBe(false)
    expect(isValidHsnCode('ABCD')).toBe(false)
    expect(isValidHsnCode('52081')).toBe(false)
  })
})

describe('stateCodeFromGstin', () => {
  test('extracts the state code from a valid GSTIN', () => {
    expect(stateCodeFromGstin('27AABCU9603R1ZM')).toBe('27')
  })

  test('returns null for an invalid GSTIN', () => {
    expect(stateCodeFromGstin('invalid')).toBeNull()
  })
})
