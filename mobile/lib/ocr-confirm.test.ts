import { describe, expect, it } from 'vitest'

import {
  buildOcrConfirmInput,
  isOcrDraftConfirmable,
  ocrDraftSummaryRows,
  validateOcrConfirmLedgers,
} from './ocr-confirm.ts'

const draft = {
  id: 'draft-1',
  status: 'needs_review',
  lowConfidenceFields: ['supplierGstin'],
  fields: {
    supplierName: { value: 'Acme Traders', confidence: 0.9 },
    supplierGstin: { value: '', confidence: 0.4 },
    billNumber: { value: 'BILL-42', confidence: 0.85 },
    billDate: { value: '2026-07-10', confidence: 0.9 },
    taxableAmount: { value: '1000.00', confidence: 0.8 },
    gstAmount: { value: '180.00', confidence: 0.8 },
    totalAmount: { value: '1180.00', confidence: 0.8 },
  },
}

describe('ocr-confirm', () => {
  it('detects confirmable drafts', () => {
    expect(isOcrDraftConfirmable(draft)).toBe(true)
    expect(isOcrDraftConfirmable({ ...draft, status: 'posted' })).toBe(false)
  })

  it('validates ledger mappings', () => {
    expect(validateOcrConfirmLedgers({})).toContain('Ledger mappings')
    expect(
      validateOcrConfirmLedgers({
        purchase: 'p1',
        input_gst: 'g1',
        supplier_payable: 'pay1',
        stock_in_hand: 's1',
      }),
    ).toBeNull()
  })

  it('builds confirm mutation input', () => {
    expect(
      buildOcrConfirmInput({
        companyId: 'company-1',
        draftId: 'draft-1',
        company: { stateCode: '27', financialYearStart: '2026-04-01' },
        ledgerBySystemKey: {
          purchase: 'p1',
          input_gst: 'g1',
          supplier_payable: 'pay1',
          stock_in_hand: 's1',
        },
      }),
    ).toMatchObject({
      companyId: 'company-1',
      draftId: 'draft-1',
      companyStateCode: '27',
      purchaseAccountId: 'p1',
    })
  })

  it('formats summary rows', () => {
    const rows = ocrDraftSummaryRows(draft)
    expect(rows[0]?.value).toBe('Acme Traders')
    expect(rows[1]?.value).toBe('Unregistered')
  })
})
