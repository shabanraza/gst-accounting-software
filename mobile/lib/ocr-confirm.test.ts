import { describe, expect, it } from 'vitest'

import {
  buildOcrConfirmInput,
  buildOcrUpdateDraftInput,
  isOcrDraftConfirmable,
  ocrDraftSummaryRows,
  validateOcrConfirmLedgers,
  validateOcrDraftFields,
} from './ocr-confirm.ts'
import { buildEmptyOcrFields } from './ocr-fields.ts'

const draftFields = {
  supplierName: { value: 'Acme Traders', confidence: 0.9 },
  supplierGstin: { value: '', confidence: 0.4 },
  billNumber: { value: 'BILL-42', confidence: 0.85 },
  billDate: { value: '2026-07-10', confidence: 0.9 },
  taxableAmount: { value: '1000.00', confidence: 0.8 },
  gstAmount: { value: '180.00', confidence: 0.8 },
  totalAmount: { value: '1180.00', confidence: 0.8 },
}

const draft = {
  id: 'draft-1',
  status: 'needs_review',
  lowConfidenceFields: ['supplierGstin'],
  fields: draftFields,
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

  it('requires minimum OCR fields before confirm', () => {
    const empty = buildEmptyOcrFields()
    expect(validateOcrDraftFields(empty)).toBe('Supplier name is required.')

    empty.supplierName = { value: 'Acme', confidence: 1 }
    expect(validateOcrDraftFields(empty)).toBe('Bill number is required.')

    empty.billNumber = { value: 'BILL-1', confidence: 1 }
    expect(validateOcrDraftFields(empty)).toBe('Bill date is required.')

    empty.billDate = { value: '2026-07-10', confidence: 1 }
    expect(validateOcrDraftFields(empty)).toBe(
      'Total amount must be greater than zero.',
    )

    empty.totalAmount = { value: '1180.00', confidence: 1 }
    expect(validateOcrDraftFields(empty)).toBeNull()
  })

  it('blocks low-confidence required fields', () => {
    const fields = buildEmptyOcrFields()
    fields.supplierName = { value: 'Acme', confidence: 0.4 }
    fields.billNumber = { value: 'BILL-1', confidence: 1 }
    fields.billDate = { value: '2026-07-10', confidence: 1 }
    fields.totalAmount = { value: '100.00', confidence: 1 }

    expect(validateOcrDraftFields(fields)).toBe(
      'Review low-confidence fields before confirming.',
    )
  })

  it('builds confirm and update mutation input', () => {
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

    expect(
      buildOcrUpdateDraftInput({
        companyId: 'company-1',
        draftId: 'draft-1',
        fields: draftFields,
      }),
    ).toMatchObject({
      companyId: 'company-1',
      draftId: 'draft-1',
      fields: draftFields,
    })
  })

  it('formats summary rows', () => {
    const rows = ocrDraftSummaryRows(draftFields)
    expect(rows[0]?.value).toBe('Acme Traders')
    expect(rows[1]?.value).toBe('Unregistered')
  })
})
