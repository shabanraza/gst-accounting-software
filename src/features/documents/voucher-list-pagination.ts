import { encodeListCursor } from '#/lib/list-query.ts'

/** Default page size for sales/purchase register infinite lists. */
export const VOUCHER_LIST_PAGE_SIZE = 50

export function nextVoucherListCursor<T extends { id: string }>(
  lastPage: Array<T>,
  pageSize: number,
  getDate: (row: T) => string,
): string | undefined {
  if (lastPage.length < pageSize) return undefined
  const last = lastPage.at(-1)
  if (!last) return undefined
  return encodeListCursor(getDate(last), last.id)
}
