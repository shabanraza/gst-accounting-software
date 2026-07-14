/** Shared list/query options for company-scoped document fetches. */
export type ListQueryOptions = {
  /** Include child line items (default true for full documents). */
  includeLines?: boolean
  startDate?: string
  endDate?: string
  partyId?: string
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

export function applyInMemoryListFilters<
  T extends { id: string },
>(
  rows: Array<T>,
  options: ListQueryOptions | undefined,
  getDate: (row: T) => string,
  getPartyId?: (row: T) => string,
): Array<T> {
  let filtered = rows

  if (options?.partyId && getPartyId) {
    filtered = filtered.filter((row) => getPartyId(row) === options.partyId)
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
