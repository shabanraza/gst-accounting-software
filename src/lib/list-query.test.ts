import { describe, expect, test } from 'vitest'

import {
  applyInMemoryListFilters,
  encodeListCursor,
  parseListCursor,
  resolveListLimit,
} from '#/lib/list-query.ts'

describe('list-query helpers', () => {
  test('parses and encodes cursors', () => {
    expect(parseListCursor('2026-07-11|abc')).toEqual({
      date: '2026-07-11',
      id: 'abc',
    })
    expect(encodeListCursor('2026-07-11', 'abc')).toBe('2026-07-11|abc')
    expect(parseListCursor('bad')).toBeNull()
  })

  test('caps limit and filters by date/party/cursor', () => {
    expect(resolveListLimit(999)).toBe(500)
    expect(resolveListLimit(undefined)).toBeUndefined()

    const rows = [
      { id: 'c', date: '2026-07-11', partyId: 'p1' },
      { id: 'b', date: '2026-07-12', partyId: 'p2' },
      { id: 'a', date: '2026-07-12', partyId: 'p1' },
    ]

    const filtered = applyInMemoryListFilters(
      rows,
      { partyId: 'p1', limit: 10 },
      (row) => row.date,
      (row) => row.partyId,
    )

    expect(filtered.map((row) => row.id)).toEqual(['a', 'c'])

    const paged = applyInMemoryListFilters(
      rows,
      { cursor: encodeListCursor('2026-07-12', 'a'), limit: 1 },
      (row) => row.date,
    )
    expect(paged.map((row) => row.id)).toEqual(['c'])
  })

  test('filters by payment status and search text', () => {
    const rows = [
      {
        id: '1',
        date: '2026-07-12',
        paymentStatus: 'Paid',
        label: 'INV-100 Acme',
      },
      {
        id: '2',
        date: '2026-07-11',
        paymentStatus: 'Pending',
        label: 'INV-200 Beta',
      },
    ]

    const paid = applyInMemoryListFilters(
      rows,
      { paymentStatus: 'Paid', limit: 10 },
      (row) => row.date,
      undefined,
      (row) => row.label,
      (row) => row.paymentStatus,
    )
    expect(paid.map((row) => row.id)).toEqual(['1'])

    const searched = applyInMemoryListFilters(
      rows,
      { search: 'beta', limit: 10 },
      (row) => row.date,
      undefined,
      (row) => row.label,
      (row) => row.paymentStatus,
    )
    expect(searched.map((row) => row.id)).toEqual(['2'])
  })

  test('cursor pagination continues past three pages', () => {
    const rows = Array.from({ length: 200 }, (_, index) => {
      const sequence = String(200 - index).padStart(3, '0')
      return {
        id: `inv-${sequence}`,
        date: '2026-07-12',
      }
    })

    const page1 = applyInMemoryListFilters(
      rows,
      { limit: 50 },
      (row) => row.date,
    )
    expect(page1).toHaveLength(50)
    expect(page1[0]?.id).toBe('inv-200')

    const lastPage1 = page1.at(-1)!
    const page2 = applyInMemoryListFilters(
      rows,
      {
        cursor: encodeListCursor(lastPage1.date, lastPage1.id),
        limit: 50,
      },
      (row) => row.date,
    )
    expect(page2).toHaveLength(50)
    expect(page2[0]?.id).toBe('inv-150')

    const lastPage2 = page2.at(-1)!
    const page3 = applyInMemoryListFilters(
      rows,
      {
        cursor: encodeListCursor(lastPage2.date, lastPage2.id),
        limit: 50,
      },
      (row) => row.date,
    )
    expect(page3).toHaveLength(50)
    expect(page3[0]?.id).toBe('inv-100')

    const lastPage3 = page3.at(-1)!
    const page4 = applyInMemoryListFilters(
      rows,
      {
        cursor: encodeListCursor(lastPage3.date, lastPage3.id),
        limit: 50,
      },
      (row) => row.date,
    )
    expect(page4).toHaveLength(50)
    expect(page4[0]?.id).toBe('inv-050')
  })
})
