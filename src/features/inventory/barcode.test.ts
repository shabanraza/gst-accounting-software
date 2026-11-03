import { describe, expect, test } from 'vitest'

import {
  ean13CheckDigit,
  encodeEan13,
  generateInStoreEan13,
  isValidEan13,
  normalizeBarcode,
} from '#/features/inventory/barcode.ts'

function sequence(values: Array<number>) {
  let index = 0
  return () => values[index++ % values.length]
}

describe('ean13CheckDigit', () => {
  test('computes the GS1 check digit for known codes', () => {
    expect(ean13CheckDigit('400638133393')).toBe(1)
    expect(ean13CheckDigit('590123412345')).toBe(7)
    expect(ean13CheckDigit('978030640615')).toBe(7)
  })
})

describe('isValidEan13', () => {
  test('accepts 13 digits with a correct check digit', () => {
    expect(isValidEan13('4006381333931')).toBe(true)
    expect(isValidEan13('5901234123457')).toBe(true)
  })

  test('rejects a wrong check digit, wrong length, or letters', () => {
    expect(isValidEan13('4006381333932')).toBe(false)
    expect(isValidEan13('400638133393')).toBe(false)
    expect(isValidEan13('40063813339A1')).toBe(false)
  })
})

describe('normalizeBarcode', () => {
  test('treats blank as no barcode', () => {
    expect(normalizeBarcode(undefined)).toBe('')
    expect(normalizeBarcode('   ')).toBe('')
  })

  test('keeps a valid EAN-13 and strips spaces', () => {
    expect(normalizeBarcode(' 5901234 123457 ')).toBe('5901234123457')
  })

  test('turns a 12-digit UPC-A into its EAN-13 form', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452')
  })

  test('returns null for anything that is not a valid EAN-13 or UPC-A', () => {
    expect(normalizeBarcode('5901234123458')).toBeNull()
    expect(normalizeBarcode('ABC-123')).toBeNull()
    expect(normalizeBarcode('12345678')).toBeNull()
  })
})

describe('generateInStoreEan13', () => {
  test('creates a valid in-store EAN-13 in the GS1 20 range', () => {
    const code = generateInStoreEan13(new Set(), sequence([0.31]))

    expect(code).toMatch(/^20\d{11}$/)
    expect(isValidEan13(code)).toBe(true)
    expect(code).toBe(`203333333333${ean13CheckDigit('203333333333')}`)
  })

  test('skips codes that are already taken', () => {
    const taken = new Set([`201111111111${ean13CheckDigit('201111111111')}`])

    const code = generateInStoreEan13(
      taken,
      sequence([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.5]),
    )

    expect(taken.has(code)).toBe(false)
    expect(isValidEan13(code)).toBe(true)
  })
})

describe('encodeEan13', () => {
  test('encodes guards, parity pattern and digits into 95 modules', () => {
    const modules = encodeEan13('5901234123457')

    expect(modules).toBe(
      [
        '101',
        // first digit 5 → left parity L G G L L G
        '0001011', // 9 L
        '0100111', // 0 G
        '0110011', // 1 G
        '0010011', // 2 L
        '0111101', // 3 L
        '0011101', // 4 G
        '01010',
        '1100110', // 1 R
        '1101100', // 2 R
        '1000010', // 3 R
        '1011100', // 4 R
        '1001110', // 5 R
        '1000100', // 7 R
        '101',
      ].join(''),
    )
    expect(modules).toHaveLength(95)
  })

  test('refuses an invalid code', () => {
    expect(() => encodeEan13('5901234123458')).toThrow()
  })
})
