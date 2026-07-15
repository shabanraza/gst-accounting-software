import { describe, expect, test } from 'vitest'

import {
  bankReconRowAmount,
  bankReconStatusLabel,
} from './bank-reconciliation.ts'

describe('bank reconciliation helpers', () => {
  test('maps status labels', () => {
    expect(bankReconStatusLabel('matched')).toBe('Matched')
    expect(bankReconStatusLabel('unmatched_book')).toBe('In books only')
    expect(bankReconStatusLabel('unmatched_statement')).toBe('In statement only')
  })

  test('picks statement and book amounts', () => {
    expect(
      bankReconRowAmount({
        statementCredit: '100.00',
        statementDebit: '0',
        bookDebit: '100.00',
        bookCredit: '0',
      }),
    ).toEqual({
      statementAmount: '100.00',
      bookAmount: '100.00',
    })
  })
})
