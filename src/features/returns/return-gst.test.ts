import Decimal from 'decimal.js'
import { describe, expect, test } from 'vitest'

import { fitReturnGstToDocument } from '#/features/returns/credit-debit-note-service.ts'
import { InMemoryCreditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'

// An invoice saved before CGST/SGST were rounded half-first: ₹10.50 at 18%
// stored GST 1.89, while recomputing today gives 2 × 0.95 = 1.90.
const legacyInvoice = {
  id: 'inv-1',
  taxableAmount: '10.50',
  totalGstAmount: '1.89',
}

function note(taxableAmount: string, totalGstAmount: string) {
  return {
    companyId: 'company-1',
    noteType: 'credit' as const,
    noteNumber: 'CN-0001',
    noteDate: '2026-11-20',
    partyId: 'party-1',
    referenceDocumentId: 'inv-1',
    taxableAmount,
    totalGstAmount,
    totalAmount: new Decimal(taxableAmount).plus(totalGstAmount).toFixed(2),
    ledgerEntryId: 'entry-1',
    narration: '',
  }
}

describe('fitReturnGstToDocument', () => {
  test('a full return reverses exactly the GST the document charged', async () => {
    const gst = await fitReturnGstToDocument(
      new InMemoryCreditDebitNoteRepository(),
      {
        companyId: 'company-1',
        document: legacyInvoice,
        taxableTotal: new Decimal('10.50'),
        gstTotal: new Decimal('1.90'),
      },
    )
    expect(gst.toFixed(2)).toBe('1.89')
  })

  test('the last return takes the GST left after earlier returns, so no paisa is stuck', async () => {
    const notes = new InMemoryCreditDebitNoteRepository()
    await notes.create({ id: 'n1', createdAt: new Date(), ...note('5.25', '0.94') })
    const gst = await fitReturnGstToDocument(notes, {
      companyId: 'company-1',
      document: legacyInvoice,
      taxableTotal: new Decimal('5.25'),
      gstTotal: new Decimal('0.94'),
    })
    expect(gst.toFixed(2)).toBe('0.95')
  })

  test('a part return keeps its own GST but never more than is left', async () => {
    const notes = new InMemoryCreditDebitNoteRepository()
    const part = await fitReturnGstToDocument(notes, {
      companyId: 'company-1',
      document: legacyInvoice,
      taxableTotal: new Decimal('5.00'),
      gstTotal: new Decimal('0.90'),
    })
    expect(part.toFixed(2)).toBe('0.90')

    await notes.create({ id: 'n1', createdAt: new Date(), ...note('10.00', '1.80') })
    const capped = await fitReturnGstToDocument(notes, {
      companyId: 'company-1',
      document: legacyInvoice,
      taxableTotal: new Decimal('0.40'),
      gstTotal: new Decimal('0.18'),
    })
    expect(capped.toFixed(2)).toBe('0.09')
  })
})
