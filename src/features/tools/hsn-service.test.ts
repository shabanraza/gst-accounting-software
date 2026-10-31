import { describe, expect, test } from 'vitest'

import {
  HSN_CHAPTERS,
  getHsnChapter,
  requiredHsnDigits,
  searchHsn,
} from '#/features/tools/hsn-service.ts'

describe('HSN chapters', () => {
  test('covers chapters 01 to 99 with unique slugs', () => {
    expect(HSN_CHAPTERS).toHaveLength(99)
    expect(HSN_CHAPTERS[0]?.code).toBe('01')
    expect(HSN_CHAPTERS.at(-1)?.code).toBe('99')
    const slugs = new Set(HSN_CHAPTERS.map((chapter) => chapter.slug))
    expect(slugs.size).toBe(99)
  })

  test('looks up a chapter by slug', () => {
    expect(getHsnChapter('chapter-61')?.title).toMatch(/knitted or crocheted/i)
    expect(getHsnChapter('chapter-100')).toBeUndefined()
  })
})

describe('searchHsn', () => {
  test('matches a code by its first two digits', () => {
    expect(searchHsn('8517').map((chapter) => chapter.code)).toEqual(['85'])
  })

  test('matches common product words', () => {
    expect(searchHsn('mobile phone').map((chapter) => chapter.code)).toContain('85')
    expect(searchHsn('Medicine').map((chapter) => chapter.code)).toContain('30')
  })

  test('finds service codes', () => {
    expect(searchHsn('restaurant').map((chapter) => chapter.code)).toContain('99')
  })

  test('returns nothing for blank input', () => {
    expect(searchHsn('  ')).toEqual([])
  })
})

describe('requiredHsnDigits', () => {
  test('follows the turnover-based rule for tax invoices', () => {
    expect(requiredHsnDigits({ aatoAbove5Crore: true, b2c: true })).toBe(6)
    expect(requiredHsnDigits({ aatoAbove5Crore: false, b2c: false })).toBe(4)
    expect(requiredHsnDigits({ aatoAbove5Crore: false, b2c: true })).toBe(0)
  })
})
