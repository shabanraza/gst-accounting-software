import { describe, expect, test } from 'vitest'

import {
  sortReportRows,
  toCsv,
} from '#/features/reports-analysis/report-table.ts'

describe('toCsv', () => {
  test('writes a header row and quotes cells that need it', () => {
    expect(
      toCsv(
        ['Item', 'Taxable'],
        [
          ['Pen, blue', '100.00'],
          ['Ink "royal"', '50.00'],
        ],
      ),
    ).toBe('Item,Taxable\r\n"Pen, blue",100.00\r\n"Ink ""royal""",50.00\r\n')
  })

  test('guards cells that a spreadsheet would run as a formula', () => {
    expect(toCsv(['Customer'], [['=HYPERLINK("x")']])).toBe(
      'Customer\r\n"\'=HYPERLINK(""x"")"\r\n',
    )
  })

  test('leaves negative amounts as numbers', () => {
    expect(toCsv(['Profit'], [['-12.50']])).toBe('Profit\r\n-12.50\r\n')
  })
})

describe('sortReportRows', () => {
  const rows = [
    { name: 'b', amount: '9.50' },
    { name: 'a', amount: '100.00' },
    { name: 'c', amount: '-3.00' },
  ]

  test('sorts amounts numerically', () => {
    expect(
      sortReportRows(rows, (row) => row.amount, 'desc').map((r) => r.name),
    ).toEqual(['a', 'b', 'c'])
  })

  test('sorts text alphabetically', () => {
    expect(
      sortReportRows(rows, (row) => row.name, 'asc').map((r) => r.name),
    ).toEqual(['a', 'b', 'c'])
  })

  test('puts empty values last', () => {
    expect(
      sortReportRows(
        [{ v: null }, { v: '2' }, { v: '1' }],
        (row) => row.v,
        'asc',
      ).map((r) => r.v),
    ).toEqual(['1', '2', null])
  })
})
