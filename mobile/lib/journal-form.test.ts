import { describe, expect, it } from 'vitest'

import {
  buildPostLedgerEntryInput,
  createInitialJournalForm,
  validateJournalForm,
} from './journal-form.ts'

describe('journal-form', () => {
  it('requires balanced lines', () => {
    const form = createInitialJournalForm()
    expect(validateJournalForm(form)).toBe('Add at least two ledger lines.')

    form.lines[0] = {
      key: '1',
      ledgerAccountId: 'a',
      debit: '100',
      credit: '',
    }
    form.lines[1] = {
      key: '2',
      ledgerAccountId: 'b',
      debit: '',
      credit: '50',
    }
    expect(validateJournalForm(form)).toContain('must equal credits')
  })

  it('builds post payload when balanced', () => {
    const form = createInitialJournalForm()
    form.lines[0] = {
      key: '1',
      ledgerAccountId: 'a',
      debit: '100',
      credit: '',
    }
    form.lines[1] = {
      key: '2',
      ledgerAccountId: 'b',
      debit: '',
      credit: '100',
    }

    expect(validateJournalForm(form)).toBeNull()
    expect(buildPostLedgerEntryInput(form, 'company-1')).toMatchObject({
      companyId: 'company-1',
      voucherType: 'journal',
      lines: expect.arrayContaining([
        expect.objectContaining({ ledgerAccountId: 'a', debit: '100' }),
      ]),
    })
  })
})
