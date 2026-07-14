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
})
