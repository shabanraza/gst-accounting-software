import Decimal from 'decimal.js'

export type SortDirection = 'asc' | 'desc'

type SortValue = string | number | null

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/

function compare(a: SortValue, b: SortValue) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const left = String(a)
  const right = String(b)
  if (NUMBER_PATTERN.test(left) && NUMBER_PATTERN.test(right)) {
    return new Decimal(left).comparedTo(right)
  }
  return left.localeCompare(right, 'en-IN', { sensitivity: 'base' })
}

/** Sorts by one column; amounts compare as numbers, blanks go last. */
export function sortReportRows<T>(
  rows: Array<T>,
  value: (row: T) => SortValue,
  direction: SortDirection,
) {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((rowA, rowB) => {
    const a = value(rowA)
    const b = value(rowB)
    if (a === null || a === '') return b === null || b === '' ? 0 : 1
    if (b === null || b === '') return -1
    return compare(a, b) * sign
  })
}

function csvCell(value: string) {
  // A leading = + - @ makes spreadsheets evaluate the cell; amounts are fine.
  const guarded =
    /^[=+\-@\t\r]/.test(value) && !NUMBER_PATTERN.test(value)
      ? `'${value}`
      : value
  return guarded !== value || /[",\r\n]/.test(guarded)
    ? `"${guarded.replaceAll('"', '""')}"`
    : guarded
}

export function toCsv(headers: Array<string>, rows: Array<Array<string>>) {
  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(',') + '\r\n')
    .join('')
}
