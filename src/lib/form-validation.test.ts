import { describe, expect, it } from 'vitest'

import {
  parsePositiveDecimal,
  requireAmountNotExceeding,
  requireBalancedJournal,
  requireVoucherLines,
} from '#/lib/form-validation.ts'

describe('form validation', () => {
  it('parses positive decimals', () => {
    expect(parsePositiveDecimal('10.5')?.toFixed(2)).toBe('10.50')
    expect(parsePositiveDecimal('0')).toBeNull()
    expect(parsePositiveDecimal('-1')).toBeNull()
  })

  it('rejects unbalanced journal lines', () => {
    expect(
      requireBalancedJournal([
        { debit: '100', credit: '' },
        { debit: '', credit: '50' },
      ]),
    ).toBe(false)
  })

  it('accepts balanced journal lines', () => {
    expect(
      requireBalancedJournal([
        { debit: '100', credit: '' },
        { debit: '', credit: '100' },
      ]),
    ).toBe(true)
  })

  it('rejects voucher lines with zero rate', () => {
    expect(requireVoucherLines([{ quantity: '1', rate: '0' }])).toBe(false)
  })

  it('rejects amounts above outstanding', () => {
    expect(requireAmountNotExceeding('150', '100', 'Receipt')).toBe(false)
    expect(requireAmountNotExceeding('50', '100', 'Receipt')).toBe(true)
  })
})
