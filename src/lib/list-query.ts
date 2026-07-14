import { and, eq, ilike, lt, or  } from 'drizzle-orm'
import type {SQL, AnyColumn } from 'drizzle-orm';


/** Shared list/query options for company-scoped document fetches. */
export type ListQueryOptions = {
  /** Include child line items (default true for full documents). */
  includeLines?: boolean
  startDate?: string
  endDate?: string
  partyId?: string
  paymentStatus?: string
  /** Case-insensitive match on document number and party name snapshot. */
  search?: string
  /** Max rows to return. */
  limit?: number
  /**
   * Opaque cursor for keyset pagination: `${date}|${id}` from the previous page.
   * Results are ordered newest-first by date then id.
   */
  cursor?: string
}

export const DEFAULT_LIST_LIMIT = 100
export const MAX_LIST_LIMIT = 500

export function resolveListLimit(limit?: number) {
  if (limit == null) return undefined
  return Math.min(Math.max(1, limit), MAX_LIST_LIMIT)
}

export function parseListCursor(cursor?: string): {
  date: string
  id: string
} | null {
  if (!cursor) return null
  const separator = cursor.indexOf('|')
  if (separator <= 0) return null
  const date = cursor.slice(0, separator)
  const id = cursor.slice(separator + 1)
  if (!date || !id) return null
  return { date, id }
}

export function encodeListCursor(date: string, id: string) {
  return `${date}|${id}`
}

/** Keyset condition for newest-first pages: rows strictly older than the cursor. */
export function keysetBeforeCursorCondition(
  cursor: { date: string; id: string },
  dateColumn: AnyColumn,
  idColumn: AnyColumn,
): SQL {
  return or(
    lt(dateColumn, cursor.date),
    and(eq(dateColumn, cursor.date), lt(idColumn, cursor.id)),
  )!
}

export function documentSearchCondition(
  search: string | undefined,
  numberColumn: AnyColumn,
  partyNameColumn: AnyColumn,
): SQL | undefined {
  const term = search?.trim()
  if (!term) return undefined

  const pattern = `%${term}%`
  return or(ilike(numberColumn, pattern), ilike(partyNameColumn, pattern))
}

export function applyInMemoryListFilters<T extends { id: string }>(
  rows: Array<T>,
  options: ListQueryOptions | undefined,
  getDate: (row: T) => string,
  getPartyId?: (row: T) => string,
  getSearchText?: (row: T) => string,
  getPaymentStatus?: (row: T) => string,
): Array<T> {
  let filtered = rows

  if (options?.partyId && getPartyId) {
    filtered = filtered.filter((row) => getPartyId(row) === options.partyId)
  }
  if (options?.paymentStatus && getPaymentStatus) {
    filtered = filtered.filter(
      (row) => getPaymentStatus(row) === options.paymentStatus,
    )
  }
  if (options?.search?.trim() && getSearchText) {
    const term = options.search.trim().toLowerCase()
    filtered = filtered.filter((row) =>
      getSearchText(row).toLowerCase().includes(term),
    )
  }
  if (options?.startDate) {
    filtered = filtered.filter((row) => getDate(row) >= options.startDate!)
  }
  if (options?.endDate) {
    filtered = filtered.filter((row) => getDate(row) <= options.endDate!)
  }

  filtered = [...filtered].sort((left, right) => {
    const dateCmp = getDate(right).localeCompare(getDate(left))
    if (dateCmp !== 0) return dateCmp
    return right.id.localeCompare(left.id)
  })

  const cursor = parseListCursor(options?.cursor)
  if (cursor) {
    filtered = filtered.filter((row) => {
      const date = getDate(row)
      if (date < cursor.date) return true
      if (date > cursor.date) return false
      return row.id < cursor.id
    })
  }

  const limit = resolveListLimit(options?.limit)
  if (limit != null) {
    filtered = filtered.slice(0, limit)
  }

  return filtered
}
