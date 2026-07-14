import { describe, expect, test } from 'vitest'

import { InvalidCsvError, parseCsvRows } from '#/features/imports/csv-parser.ts'

describe('parseCsvRows', () => {
  test('parses a header row and data rows into objects', () => {
    const csv = `name,partyType,gstin,stateCode
Imported Retail,customer,27AAAAA0000A1Z5,27
Imported Mill,supplier,,24`

    const rows = parseCsvRows(csv)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      name: 'Imported Retail',
      partyType: 'customer',
      gstin: '27AAAAA0000A1Z5',
      stateCode: '27',
    })
    expect(rows[1]?.gstin).toBe('')
  })

  test('supports quoted fields containing commas', () => {
    const csv = `name,description\n"Acme, Inc.",Fabric supplier`

    const rows = parseCsvRows(csv)

    expect(rows[0]?.name).toBe('Acme, Inc.')
  })

  test('throws when the CSV text has no rows', () => {
    expect(() => parseCsvRows('   \n  ')).toThrow(InvalidCsvError)
  })
})
